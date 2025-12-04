import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) { }

  findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: { product: true },
        },
        user: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    // Llamar a la funcion sendMessageWithResumeOrder.
    await this.telegramService.sendMessageWithResumeOrder(order);

    return order;
  }

  async findOneV02(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    return order;
  }

  async create(dto: CreateOrderDto) {
    // Validar usuario
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Usuario no existe');

    if (dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un item');
    }

    // Obtener productos
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no existen o están inactivos');
    }

    // Calcular total
    let total = 0;
    for (const item of dto.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new BadRequestException('Producto no encontrado');
      }
      total += Number(product.price) * item.quantity;
    }

    // Crear el pedido en una transacción
    const order = await this.prisma.$transaction(async tx => {
      const newOrder = await tx.order.create({
        data: {
          userId: dto.userId,
          total: total,
        },
      });

      await tx.orderItem.createMany({
        data: dto.items.map(item => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      return newOrder;
    });

    //await this.telegramService.sendMessageWithResumeOrder(dto);

    return this.findOne(order.id);
  }

  async update(id: number, dto: UpdateOrderDto) {
    //await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async updateStatus(id: number, status: OrderStatus) {
    //await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number) {
    //await this.findOne(id);
    return this.prisma.order.delete({
      where: { id },
    });
  }
}
