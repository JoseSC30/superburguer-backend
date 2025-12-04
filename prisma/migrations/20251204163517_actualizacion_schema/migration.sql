-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('RUTA_RECOJO', 'ESPERA_RESTAURANTE', 'RUTA_ENTREGA', 'ENTREGADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "placa" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "latActual" DOUBLE PRECISION,
    "lngActual" DOUBLE PRECISION,
    "vistoPorUltimaVez" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "estado" "DeliveryStatus" NOT NULL DEFAULT 'RUTA_RECOJO',
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupNombre" TEXT NOT NULL,
    "dropoffLat" DOUBLE PRECISION NOT NULL,
    "dropoffLng" DOUBLE PRECISION NOT NULL,
    "dropoffNombre" TEXT NOT NULL,
    "dropoffDireccion" TEXT NOT NULL,
    "dropoffReferencia" TEXT,
    "distanciaMetros" INTEGER,
    "etaSegundos" INTEGER,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recogidoEn" TIMESTAMP(3),
    "entregadoEn" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_placa_key" ON "Driver"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
