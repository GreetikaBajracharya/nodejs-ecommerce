import Coupon from "../models/coupon.model.js";
import {stripe} from "../lib/stripe.js";

export const createCheckoutSession = async (req, res) => {
    try {
        const {products, couponCode} = req.body;
        if(!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({message: "Invalid or empty products"});
        }

        let totalAmount = 0;

        const lineItems = products.map(product  => {
            const amount = Math.round(product.price * 100); 
            totalAmount += amount * product.quantity;
            return {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: amount,
                },
            }
        });

        let coupon = null;

        if(couponCode) {
            coupon = await Coupon.findOne({code: couponCode, userId: req.user._id, isActive: true});

            if(coupon) {
                totalAmount -= Math.round(totalAmount * (coupon.discountPercentage / 100));
            } 
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
            discounts: coupon 
            ? [
                {
                    coupon: await createStripeCoupon(coupon.discountPercentage),
                }
              ] 
            : [],
            metadata: {
                userId: req.user._id.toString(),
                couponCode: coupon.code || "",
            }
        });

        if(totalAmount >= 20000){
            await createNewCoupon(req.user._id);
        }
        res.status(200).json({id: session.id, totalAmount: totalAmount/100});

    } catch (error) {
        console.log("Error in create checkout session controller",error);
        res.status(500).json({message: "Internal server error",error: error.message});
    }
};

async function createStripeCoupon(discountPercentage) {
    const coupon = await stripe.coupons.create({
        percentage_off: discountPercentage,
        duration: "once",
    })

    return coupon.id;
}

async function createNewCoupon(userId) {
    const newCoupon = new Coupon({
        code: "GIFT" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        discountPercentage: 10,
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId: userId,
        isActive: true,
    });

    await newCoupon.save();

    return newCoupon;
}