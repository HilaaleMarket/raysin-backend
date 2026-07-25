import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

// Ku xidh Supabase DATABASE_URL-ka isticmaalaya driver adapter-ka Prisma v7
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Nadiifinta database-ka ayaa bilaabanaysa...")

  try { await prisma.dailySchedule.deleteMany() } catch (e) {}
  try { await prisma.materialLog.deleteMany() } catch (e) {}
  try { await prisma.labourLog.deleteMany() } catch (e) {}
  try { await prisma.transaction.deleteMany() } catch (e) {}
  try { await prisma.payment.deleteMany() } catch (e) {}
  try { await prisma.orderItem.deleteMany() } catch (e) {}
  try { await prisma.order.deleteMany() } catch (e) {}
  try { await prisma.product.deleteMany() } catch (e) {}
  try { await prisma.category.deleteMany() } catch (e) {}
  try { await prisma.vendor.deleteMany() } catch (e) {}
  try { await prisma.wallet.deleteMany() } catch (e) {}
  try { await prisma.user.deleteMany() } catch (e) {}

  console.log("Abuurista Admin-ka rasmiga ah ee Hilaale / Raysin...")

  const hashedPassword = await bcrypt.hash("horseed26@@010CH", 10)

  // 1. Admin User
  await prisma.user.create({
    data: {
      email: "raysin@horseed.so",
      name: "Horseed Admin",
      role: "admin",
      password: hashedPassword,
      city: "Hargeisa",
      phone: "+252 63 380 938",
      referralCode: "REF-HORSEED01"
    }
  })

  // 2. Vendor
  const vendorPassword = await bcrypt.hash("Vendor123!@#", 10)
  const vendorA = await prisma.vendor.create({
    data: {
      name: "Sahal Building Materials",
      shopName: "Sahal Hardware & Building",
      email: "sahal@materials.com",
      phone: "+252 63 063444555",
      password: vendorPassword,
      status: "approved"
    }
  })

  // 3. Category & Products
  const categoryA = await prisma.category.create({
    data: { name: "Agabka Dhismaha (Building Materials)" }
  })

  await prisma.product.createMany({
    data: [
      {
        name: "Samiinto (Cement) - Portland",
        description: "Samiinto dhismaha oo tayo sare leh",
        price: 8.5,
        stock: 500,
        vendorId: vendorA.id,
        categoryId: categoryA.id
      },
      {
        name: "Birta Dhismaha (Rebar 12mm)",
        description: "Birta dhismaha tiirarka",
        price: 12.0,
        stock: 150,
        vendorId: vendorA.id,
        categoryId: categoryA.id
      }
    ]
  })

  // 4. Operations Tracking Data
  await prisma.labourLog.createMany({
    data: [
      { employeeName: "Ahmed Cali", role: "Faro-yare (Mason)", hoursWorked: 8, hourlyRate: 3.5, totalCost: 28.0 },
      { employeeName: "Guuleed Cumar", role: "Muruqmaal", hoursWorked: 8, hourlyRate: 2.0, totalCost: 16.0 }
    ]
  })

  await prisma.materialLog.createMany({
    data: [
      { materialName: "Ciid Cas (Red Sand)", quantity: 2, unitPrice: 45.0, totalCost: 90.0, vendorName: "Hargeisa Quarry" },
      { materialName: "Biyo (Water Trucked)", quantity: 1, unitPrice: 20.0, totalCost: 20.0, vendorName: "Biyo Maal" }
    ]
  })

  await prisma.dailySchedule.createMany({
    data: [
      { taskName: "Shubista Tiirarka Dabaqa 1aad", assignedTo: "Eng. Mustafe", estimatedBudget: 150.0, scheduledDate: new Date(), status: "PENDING" },
      { taskName: "Qodidda Foundation-ka", assignedTo: "Cali Dheere", estimatedBudget: 80.0, scheduledDate: new Date(), status: "COMPLETED" }
    ]
  })

  console.log("🎉 Database-kii Supabase waxaa lagu shubay xogta rasmiga ah oo guulaysatay!")
}

main()
  .catch((e) => {
    console.error("Cilad ayaa dhacday intii lagu guda jiray seeding-ka:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })