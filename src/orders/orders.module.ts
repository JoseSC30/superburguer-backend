import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TelegramService } from 'src/telegram/telegram.service';

@Module({
  imports: [PrismaModule],
  providers: [OrdersService, TelegramService],
  controllers: [OrdersController]
})
export class OrdersModule {}
