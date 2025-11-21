import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import axios from 'axios';

@Injectable()
export class TelegramService {
    private readonly apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

    constructor(private prisma: PrismaService) { }

    async handleStart(user: any) {
        const telegramId = user.id.toString();

        // Verificar si ya existe
        const exists = await this.prisma.user.findUnique({
            where: { telegramId },
        });

        // Si no existe → crearlo
        if (!exists) {
            await this.prisma.user.create({
                data: {
                    telegramId,
                    name: user.first_name,
                },
            });
            console.log(`Nuevo usuario registrado: ${user.first_name} (${telegramId})`);
        } else {
            console.log(`Usuario existente: ${user.first_name} (${telegramId})`);
        }

        // Enviar mensaje de bienvenida
        await this.sendMessage(
            telegramId,
            `¡Hola ${user.first_name}! 🍔\nBienvenido a SuperSuperBurger.\nUsá /menu para ver nuestras hamburguesas.`
        );
        //console.log(`Usuario ${user.first_name} (${telegramId}) ha iniciado el bot.`);
        //console.log(`Mi Token es: ${process.env.TELEGRAM_TOKEN}`);
    }

    async handleMenu(chatId: number,) {
        //console.log('Enviando menú al chat ID:', chatId);

        try {
            await this.sendMessageButton(chatId, "Abrí el menú para hacer tu pedido:", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🍔 Abrir menú",
                                web_app: { url: process.env.FRONTEND_URL }
                            }
                        ]
                    ]
                }
            });
        } catch (error) {
            console.error('Error sending menu:', error.response?.data);
            throw error;
        }
    }

    async sendMessage(chatId: number, text: string) {
        return axios.post(`${this.apiUrl}/sendMessage`, {
            chat_id: chatId,
            text,
        });
    }

    async sendMessageButton(chatId: number, text: string, options: any) {
        console.log('Mensaje enviado con botón al chat ID:', chatId);
        return axios.post(`${this.apiUrl}/sendMessage`, {
            chat_id: chatId,
            text,
            ...options,
        });
    }

    async sendMessageWithResumeOrder(order: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: order.userId },
        });

        if (!user || !user.telegramId) {
            throw new Error('Usuario no encontrado o sin Telegram ID');
        }

        const telegramId = parseInt(user.telegramId);
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
        console.log('Pedido Rgistrado:', order.id);
        // Imprimir el contenido de order.
        console.log('Contenido de order:', order);

        return this.sendMessageButton(telegramId, message, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "🟩 Pagar",
                            callback_data: `pay_${order.id}`
                        },
                        {
                            text: "🟥 Cancelar",
                            callback_data: `cancel_${order.id}`
                        }
                    ]
                ]
            }
        });

    }

    async askPaymentMethod(chatId: number, orderId: number) {
        await this.sendMessageButton(chatId, "Elegí el método de pago:", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📲 Pago QR", callback_data: `payqr_${orderId}` },
                        { text: "💵 Efectivo", callback_data: `paycash_${orderId}` }
                    ]
                ]
            }
        });
    }

    async cancelOrder(chatId: number, orderId: number) {
        try {
            // Debe eliminar la orden de la base de datos
            await this.prisma.orderItem.deleteMany({
                where: { orderId },
            });
            await this.prisma.order.delete({
                where: { id: orderId },
            });
            console.log(`Pedido #${orderId} eliminado correctamente`);
            await this.sendMessage(chatId, `Tu pedido #${orderId} ha sido cancelado. Si querés, podés hacer un nuevo pedido usando /menu.`);
        } catch (error) {
            console.error(`Error al eliminar pedido #${orderId}:`, error);
            await this.sendMessage(chatId, `Hubo un error al cancelar tu pedido #${orderId}. Por favor, intentá nuevamente.`);
        }
    }

    async payWithQR(chatId: number, orderId: number) {
        await this.sendMessage(chatId, `Para pagar el pedido #${orderId} con QR, escaneá el siguiente código:\n\n[Enlace al código QR](https://example.com/qr-code-placeholder)`);
    }

    async payWithCash(chatId: number, orderId: number) {
        await this.sendMessage(chatId, `Has elegido pagar el pedido #${orderId} en efectivo al momento de la entrega. ¡Gracias por tu compra!`);
    }
}