import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Injectable()
export class DriversService {
  private readonly activeDeliveryStatuses: DeliveryStatus[] = [
    DeliveryStatus.RUTA_RECOJO,
    DeliveryStatus.ESPERA_RESTAURANTE,
    DeliveryStatus.ESPERA_CLIENTE,
    DeliveryStatus.RUTA_ENTREGA,
  ];

  private readonly updatableStatuses: DeliveryStatus[] = [
    DeliveryStatus.RUTA_RECOJO,
    DeliveryStatus.ESPERA_RESTAURANTE,
    DeliveryStatus.ESPERA_CLIENTE,
    DeliveryStatus.RUTA_ENTREGA,
    DeliveryStatus.ENTREGADO,
    DeliveryStatus.CANCELADO,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  async login(dto: LoginDriverDto) {
    const driver = await this.prisma.driver.findUnique({ where: { username: dto.username } });
    if (!driver || driver.password !== dto.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      ok: true,
      driverId: driver.id,
      name: driver.name,
    };
  }

  async updateLocation(driverId: number, dto: UpdateLocationDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        latActual: dto.lat,
        lngActual: dto.lng,
        vistoPorUltimaVez: new Date(),
      },
      select: {
        id: true,
        name: true,
        latActual: true,
        lngActual: true,
        vistoPorUltimaVez: true,
        activo: true,
      },
    });
  }

  async getActiveDelivery(driverId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }

    const delivery = await this.prisma.delivery.findFirst({
      where: {
        driverId,
        estado: { in: this.activeDeliveryStatuses },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            user: {
              select: {
                name: true,
                locationLat: true,
                locationLng: true,
              },
            },
          },
        },
      },
      orderBy: { asignadoEn: 'desc' },
    });

    return {
      hasDelivery: Boolean(delivery),
      delivery,
    };
  }

  async updateDeliveryStatus(
    driverId: number,
    deliveryId: number,
    dto: UpdateDeliveryStatusDto,
  ) {
    if (!this.updatableStatuses.includes(dto.status)) {
      throw new BadRequestException('Estado no permitido para el conductor');
    }

    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: { select: { id: true } },
      },
    });

    if (!delivery || delivery.driverId !== driverId) {
      throw new NotFoundException('Entrega no encontrada o no asignada a este conductor');
    }

    const data: Record<string, any> = {
      estado: dto.status,
      actualizadoEn: new Date(),
    };

    if (dto.status === DeliveryStatus.RUTA_ENTREGA && !delivery.recogidoEn) {
      data.recogidoEn = new Date();
    }

    if (dto.status === DeliveryStatus.ENTREGADO) {
      data.entregadoEn = new Date();
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            user: {
              select: {
                name: true,
                telegramId: true,
                locationLat: true,
                locationLng: true,
              },
            },
          },
        },
        driver: {
          select: {
            name: true,
            username: true,
            placa: true,
          },
        },
      },
    });

    if (dto.status === DeliveryStatus.ENTREGADO) {
      await this.prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.ENTREGADO },
      });
    }

    const telegramId = updatedDelivery.order?.user?.telegramId;
    if (telegramId) {
      const message = this.buildStatusNotification(
        updatedDelivery.order.id,
        dto.status,
        updatedDelivery.driver?.name,
      );
      await this.telegramService.sendMessage(telegramId, message);
    }

    return updatedDelivery;
  }

  private buildStatusNotification(
    orderId: number,
    status: DeliveryStatus,
    driverName?: string | null,
  ) {
    const name = driverName ?? 'El conductor asignado';
    switch (status) {
      case DeliveryStatus.RUTA_RECOJO:
        return `🚚 ${name} va camino al local para recoger tu pedido #${orderId}.`;
      case DeliveryStatus.ESPERA_RESTAURANTE:
        return `⌛ ${name} ya llegó al local y está esperando que tu pedido #${orderId} esté listo.`;
      case DeliveryStatus.RUTA_ENTREGA:
        return `📦 ${name} ya tiene tu pedido #${orderId} y se dirige hacia tu ubicación.`;
      case DeliveryStatus.ESPERA_CLIENTE:
        return `📍 ${name} ya llegó a tu ubicación y está esperándote con el pedido #${orderId}.`;
      case DeliveryStatus.ENTREGADO:
        return `✅ Tu pedido #${orderId} fue entregado. ¡Buen provecho!`;
      case DeliveryStatus.CANCELADO:
        return `⚠️ El envío del pedido #${orderId} fue cancelado. Si necesitás ayuda, escribinos.`;
      default:
        return `Tu pedido #${orderId} tuvo una actualización de estado.`;
    }
  }
}
