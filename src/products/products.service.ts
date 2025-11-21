import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const prod = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!prod) throw new NotFoundException('Producto no encontrado');

    return prod;
  }

  create(data: CreateProductDto) {
    return this.prisma.product.create({
      data,
    });
  }

  async update(id: number, data: UpdateProductDto) {
    await this.findOne(id); // valida que exista

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // borrado lógico
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }
}
