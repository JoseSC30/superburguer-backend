import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) { }

    //   Mensajes entrantes del bot de Telegram

    @Get('response-after-payqr/:chatId/:orderId')
    async responseAfterPayWithQR(
        @Param('chatId', ParseIntPipe) chatId: number,
        @Param('orderId', ParseIntPipe) orderId: number,
    ) {
        return this.telegramService.responseAfterPayWithQR(chatId, orderId);
    }

    @Post('webhook')
    async handleWebhook(@Body() body) {

        // Primero manejar callback_query (botones)
        if (body.callback_query) {
            const cb = body.callback_query;
            const data = cb.data;
            const chatId = cb.from.id;

            console.log('CALLBACK RECIBIDO:', data);

            if (data.startsWith('pay_')) {
                const orderId = Number(data.replace('pay_', ''));
                return await this.telegramService.askPaymentMethod(chatId, orderId);
            }

            if (data.startsWith('cancel_')) {
                const orderId = Number(data.replace('cancel_', ''));
                console.log('Cancelando pedido:', orderId);
                return await this.telegramService.cancelOrder(chatId, orderId);
            }

            if (data.startsWith('payqr_')) {
                const orderId = Number(data.replace('payqr_', ''));
                return await this.telegramService.payWithQR(chatId, orderId);
            }

            if (data.startsWith('paycash_')) {
                const orderId = Number(data.replace('paycash_', ''));
                return await this.telegramService.payWithCash(chatId, orderId);
            }

            return { ok: true };
        }

        // Ahora sí los mensajes normales
        const msg = body.message;
        if (!msg) return { ok: true };

        const user = msg.from;

        if (msg.location) {
            await this.telegramService.saveUserLocation(user, msg.location);
            return { ok: true };
        }

        const text = (msg.text ?? '').trim();

        if (text === '/start') {
            await this.telegramService.handleStart(user);
        }

        if (text === '/menu') {
            await this.telegramService.handleMenu(msg.chat.id);
        }

        if (text === '/ubicacion') {
            await this.telegramService.requestLocation(msg.chat.id);
        }

        console.log('WEBHOOK BODY:', JSON.stringify(body, null, 2));
        return { ok: true };
    }

}