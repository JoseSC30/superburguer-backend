import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [PrismaModule, UsersModule, ProductsModule, OrdersModule, TelegramModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
