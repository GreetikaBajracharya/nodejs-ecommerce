import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req,res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        console.log("Error in get all products controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const getFeaturedProducts = async (req,res) => {
    try {
        let featuredProducts = await redis.get("featured_products");
        if(featuredProducts) {
           return res.json(JSON.parse(featuredProducts));
        }
        
        //if not in redis, fetch from mongodb
        //.lean() returns plain js obj instead of mongodb doc which is good for performance
        featuredProducts = await Product.find({isFeatured: true}).lean();

        if(!featuredProducts) {
            return res.status(404).json({message: "Featured products not found"});
        }

        //store in redis for future quick access
        await redis.set("featured_products", JSON.stringify(FeaturedProducts));
        res.json(featuredProducts);
    } catch (error) {
        console.log("Error in get featured products controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const createProduct = async (req,res) => {
    try {
        const {name, price, description, category, image} = req.body;

        let cloudinaryResponse = null;

        if(image){
            cloudinaryResponse = await cloudinary.uploader.upload(image, {folder:"products"});
        }

        const product = await Product.create({
            name,
            price,
            description,
            category,
            image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
        }); 

        res.status(201).json(product);
    } catch (error) {
        console.log("Error in create product controller",error);
        res.status(500).json({message: "Product creation failed"});
    }
};


