import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({userId: req.user._id, isActive: true});    
        res.json(coupon || null);

    } catch (error) {
        console.log("Error in get coupon controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const validateCoupon = async (req, res) => {
    try {
        const {code} = req.body;

        const coupon = await Coupon.findOne({code:code, userId: req.user._id, isActive: true});

        if(!coupon) {
            res.status(404).json({message: "Coupon not found"});
        }

        if(coupon.expireDate < new Date()) {
            coupon.isActive = false;
            await coupon.save();
            res.status(404).json({message: "Coupon expired"});
        }
            
        res.json({
            message: "Coupon is valid",
            code: coupon.code,
            discountPercentage: coupon.discountPercentage
        });

    } catch (error) {
        console.log("Error in validate coupon controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};