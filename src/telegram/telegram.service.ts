import { Injectable } from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

type TelegramLocation = {
  latitude: number;
  longitude: number;
};

@Injectable()
export class TelegramService {
  private readonly apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
  private readonly restaurantCoords = {
    lat: -17.7837793056728,
    lng: -63.18175049023291,
    name: 'SuperBurger Central',
  };
  private readonly activeDeliveryStatuses: DeliveryStatus[] = [
    DeliveryStatus.RUTA_RECOJO,
    DeliveryStatus.ESPERA_RESTAURANTE,
    DeliveryStatus.ESPERA_CLIENTE,
    DeliveryStatus.RUTA_ENTREGA,
  ];

  constructor(private prisma: PrismaService) {}

  async handleStart(user: any) {
    const telegramId = user.id.toString();
    const firstName = user.first_name ?? user.username ?? 'SuperFan';

    const exists = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!exists) {
      await this.prisma.user.create({
        data: {
          telegramId,
          name: firstName,
        },
      });
      console.log(`Nuevo usuario registrado: ${firstName} (${telegramId})`);
    } else {
      console.log(`Usuario existente: ${firstName} (${telegramId})`);
    }

    await this.sendMessage(
      telegramId,
      `¡Hola ${firstName}! 🍔\nBienvenido a SuperSuperBurger.\nUsá /menu para ver nuestras hamburguesas.`,
    );
  }

  async handleMenu(chatId: number) {
    try {
      await this.sendMessageButton(chatId, 'Abrí el menú para hacer tu pedido:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🍔 Abrir menú',
                web_app: { url: process.env.FRONTEND_URL },
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error sending menu:', error.response?.data ?? error.message);
      throw error;
    }
  }

  async requestLocation(chatId: number) {
    await this.sendMessageButton(chatId, 'Compartí tu ubicación actual usando el botón 👇', {
      reply_markup: {
        keyboard: [
          [
            {
              text: '📍 Enviar ubicación',
              request_location: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  async saveUserLocation(user: any, location: TelegramLocation) {
    const telegramId = user.id.toString();
    const name = user.first_name ?? user.username ?? null;
    const now = new Date();

    await this.prisma.user.upsert({
      where: { telegramId },
      update: {
        name,
        locationLat: location.latitude,
        locationLng: location.longitude,
        locationUpdatedAt: now,
      },
      create: {
        telegramId,
        name,
        locationLat: location.latitude,
        locationLng: location.longitude,
        locationUpdatedAt: now,
      },
    });

    await this.sendMessage(telegramId, '✅ Recibimos tu ubicación. Gracias por compartirla.');
  }

  async sendMessage(chatId: number | string, text: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
      });
      return response.data;
    } catch (error) {
      console.error('Error al enviar mensaje a Telegram:', error.response?.data ?? error.message);
      throw error;
    }
  }

  async sendMessageButton(chatId: number | string, text: string, options: any) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error('Error al enviar mensaje con botón:', error.response?.data ?? error.message);
      throw error;
    }
  }

  async sendMessageWithResumeOrder(order: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (!user || !user.telegramId) {
      throw new Error('Usuario no encontrado o sin Telegram ID');
    }

    let total = 0;
    let message = `🧾 *Resumen de tu pedido*\n\n`;

    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) continue;

      message += `- ${product.name}: $${product.price} x ${item.quantity}\n`;
      total += Number(product.price) * item.quantity;
    }

    message += `\n*Total: $${total}*`;

    return this.sendMessageButton(user.telegramId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🟩 Pagar', callback_data: `pay_${order.id}` },
            { text: '🟥 Cancelar', callback_data: `cancel_${order.id}` },
          ],
        ],
      },
    });
  }

  async askPaymentMethod(chatId: number, orderId: number) {
    await this.sendMessageButton(chatId, 'Elegí el método de pago:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📲 Pago QR', callback_data: `payqr_${orderId}` },
            { text: '💵 Efectivo', callback_data: `paycash_${orderId}` },
          ],
        ],
      },
    });
  }

  async cancelOrder(chatId: number, orderId: number) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELADO },
      });
      await this.sendMessage(chatId, `Tu pedido #${orderId} ha sido cancelado. Si querés, podés hacer un nuevo pedido usando /menu.`);
    } catch (error) {
      console.error(`Error al cancelar pedido #${orderId}:`, error);
      await this.sendMessage(chatId, `Hubo un error al cancelar tu pedido #${orderId}. Por favor, intentá nuevamente.`);
    }
  }

  async payWithQR(chatId: number, orderId: number) {
    try {
      await this.sendMessageButton(chatId, 'Escaneá el código QR para pagar:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📱 Abrir QR de pago',
                web_app: { url: `${process.env.FRONTEND_QR_URL}?orderId=${orderId}` },
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error sending QR payment:', error.response?.data ?? error.message);
      throw error;
    }
  }

  async payWithCash(chatId: number, orderId: number) {
    await this.sendMessage(chatId, `Has elegido pagar el pedido #${orderId} en efectivo al momento de la entrega. ¡Gracias por tu compra!`);
  }

  async responseAfterPayWithQR(chatId: number, orderId: number) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMADO },
      });
    } catch (error) {
      console.error(`No se pudo actualizar el pedido #${orderId} a CONFIRMADO:`, error);
    }

    await this.sendMessage(
      chatId,
      `Hemos recibido el pago de tu pedido #${orderId}. ¡Gracias por tu compra! 🍔🎉`,
    );

    try {
      await this.assignOrderToNearestDriver(orderId);
    } catch (error) {
      console.error('Error al asignar conductor:', error);
    }

    return { ok: true, message: 'Mensaje enviado correctamente' };
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  private calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371e3;
    const phi1 = this.toRadians(lat1);
    const phi2 = this.toRadians(lat2);
    const deltaPhi = this.toRadians(lat2 - lat1);
    const deltaLambda = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async findClosestAvailableDriver() {
    const drivers = await this.prisma.driver.findMany({
      where: {
        activo: true,
        latActual: { not: null },
        lngActual: { not: null },
      },
      select: {
        id: true,
        name: true,
        username: true,
        placa: true,
        latActual: true,
        lngActual: true,
        entregas: {
          where: { estado: { in: this.activeDeliveryStatuses } },
          select: { id: true },
          take: 1,
        },
      },
    });

    const freeDrivers = drivers.filter(driver => driver.entregas.length === 0);
    if (!freeDrivers.length) {
      return null;
    }

    let bestDriver = freeDrivers[0];
    let bestDistance = this.calculateDistanceMeters(
      bestDriver.latActual as number,
      bestDriver.lngActual as number,
      this.restaurantCoords.lat,
      this.restaurantCoords.lng,
    );

    for (let i = 1; i < freeDrivers.length; i++) {
      const driver = freeDrivers[i];
      const distance = this.calculateDistanceMeters(
        driver.latActual as number,
        driver.lngActual as number,
        this.restaurantCoords.lat,
        this.restaurantCoords.lng,
      );

      if (distance < bestDistance) {
        bestDriver = driver;
        bestDistance = distance;
      }
    }

    return { driver: bestDriver, distanceMeters: bestDistance };
  }

  private buildDriverAssignedMessage(orderId: number, driver: { name: string; placa: string | null; username: string | null }) {
    const placaLine = driver.placa ? `• Placa: ${driver.placa}` : '• Placa no registrada';
    const userLine = driver.username ? `• Usuario: @${driver.username}` : '• Usuario sin Telegram';
    return `🚚 Tu pedido #${orderId} fue asignado a ${driver.name}.\n${placaLine}\n${userLine}\nEl conductor ya está en camino al local para recoger tu pedido.`;
  }

  private async assignOrderToNearestDriver(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user || !order.user.telegramId) {
      console.warn(`No se pudo asignar conductor: pedido ${orderId} sin usuario/telegramId`);
      return;
    }

    const telegramId = order.user.telegramId;

    if (order.user.locationLat == null || order.user.locationLng == null) {
      await this.sendMessage(
        telegramId,
        'Necesitamos tu ubicación antes de asignar un conductor. Usá /ubicacion para compartirla.',
      );
      return;
    }

    const closest = await this.findClosestAvailableDriver();
    if (!closest) {
      await this.sendMessage(
        telegramId,
        'Por ahora no hay conductores disponibles. Te avisaremos apenas uno quede libre.',
      );
      return;
    }

    const { driver, distanceMeters } = closest;
    const baseData = {
      driverId: driver.id,
      estado: DeliveryStatus.RUTA_RECOJO,
      pickupLat: this.restaurantCoords.lat,
      pickupLng: this.restaurantCoords.lng,
      pickupNombre: this.restaurantCoords.name,
      dropoffLat: order.user.locationLat,
      dropoffLng: order.user.locationLng,
      dropoffNombre: order.user.name ?? 'Cliente SuperBurger',
      dropoffDireccion: 'Ubicación compartida vía Telegram',
      dropoffReferencia: null,
      distanciaMetros: Math.round(distanceMeters),
      etaSegundos: null,
      asignadoEn: new Date(),
      recogidoEn: null,
      entregadoEn: null,
    };

    await this.prisma.delivery.upsert({
      where: { orderId },
      update: baseData,
      create: {
        orderId,
        ...baseData,
      },
    });

    await this.sendMessage(telegramId, this.buildDriverAssignedMessage(orderId, driver));
  }
}
