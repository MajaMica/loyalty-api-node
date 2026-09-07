import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.send('🚀 Loyalty System API is running!');
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user points by ID
app.get('/points/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, points: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign points based on order total
app.post('/assign-points', async (req, res) => {
  try {
    const { userId, orderTotal } = req.body;

    if (!userId || orderTotal === undefined) {
      return res.status(400).json({ error: 'Missing userId or orderTotal' });
    }

    // Calculate points (same logic as WordPress)
    let pointsEarned = 0;
    if (orderTotal < 5000) {
      pointsEarned = 50;
    } else {
      pointsEarned = 100;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { points: user.points + pointsEarned },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: userId,
        pointsChange: pointsEarned,
        description: `Earned ${pointsEarned} points for order total ${orderTotal} RSD`,
      },
    });

    res.json({
      success: true,
      pointsEarned,
      newBalance: updatedUser.points,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Generate a coupon and create it in WooCommerce
app.post('/generate-coupon', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Check if they have points
    if (user.points <= 0) {
      return res.status(400).json({ error: 'No points available to convert' });
    }

    const pointsToSpend = user.points;
    const couponAmount = pointsToSpend; // 1 point = 1 RSD

    // 3. Generate a unique coupon code
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couponCode = `FIRE-${randomPart}`;

    // 4. Save the coupon to our database
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        userId: userId,
        amount: couponAmount,
        isUsed: false,
      },
    });

    // 5. Create the coupon in WooCommerce via REST API
    const wooResponse = await axios.post(
      `${process.env.WC_URL}/wp-json/wc/v3/coupons`,
      {
        code: couponCode,
        amount: couponAmount.toString(),
        discount_type: 'fixed_cart',
        individual_use: true,
        usage_limit: 1,
      },
      {
        auth: {
          username: process.env.WC_CONSUMER_KEY,
          password: process.env.WC_CONSUMER_SECRET,
        },
      }
    );

    // 6. Reset user points to 0
    await prisma.user.update({
      where: { id: userId },
      data: { points: 0 },
    });

    // 7. Log the spending
    await prisma.transaction.create({
      data: {
        userId: userId,
        pointsChange: -pointsToSpend,
        description: `Generated coupon ${couponCode} for ${couponAmount} RSD (WooCommerce ID: ${wooResponse.data.id})`,
      },
    });

    // 8. Return the coupon code
    res.json({
      success: true,
      couponCode: couponCode,
      amount: couponAmount,
      wooCommerceId: wooResponse.data.id,
      message: `Coupon ${couponCode} created in WooCommerce for ${couponAmount} RSD!`,
    });
  } catch (error) {
    console.error('Error generating coupon:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Webhook for WooCommerce - called when order is completed
app.post('/webhook/order-completed', async (req, res) => {
  try {
    // Ako je testni zahtev (samo webhook_id), vrati OK
if (req.body.webhook_id) {
  console.log('✅ Test webhook primljen, vraćam OK');
  return res.status(200).json({ message: 'Webhook active' });
}
    console.log('📦 WEBHOOK PAYLOAD:', JSON.stringify(req.body, null, 2));
console.log('📦 HEADERS:', req.headers);
    // 1. Verify webhook secret (for security)
    const signature = req.headers['x-wc-webhook-signature'];
    if (signature !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Extract order data from WooCommerce webhook payload
    const orderData = req.body;
    const orderTotal = parseFloat(orderData.total); // Total amount
    const customerEmail = orderData.billing?.email;

    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email not found' });
    }

    // 3. Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: customerEmail },
    });

    if (!user) {
      // Create a new user if they don't exist yet
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          name: orderData.billing?.first_name + ' ' + orderData.billing?.last_name || 'Guest',
          points: 0,
        },
      });
    }

    // 4. Calculate points (same logic as /assign-points)
    let pointsEarned = 0;
    if (orderTotal < 5000) {
      pointsEarned = 50;
    } else {
      pointsEarned = 100;
    }

    // 5. Update user points
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { points: user.points + pointsEarned },
    });

    // 6. Log the transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        pointsChange: pointsEarned,
        description: `Earned ${pointsEarned} points from order #${orderData.number || 'N/A'} (webhook)`,
      },
    });

    // 7. Return success response to WooCommerce
    res.status(200).json({
      success: true,
      message: `Points assigned: ${pointsEarned}`,
      newBalance: updatedUser.points,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🔥 Server running on http://localhost:${port}`);
});