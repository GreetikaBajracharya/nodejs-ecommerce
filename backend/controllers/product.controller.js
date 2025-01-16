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

export const deleteProduct = async (req,res) => {
    try {
        const product = await Product.findById(req.params.id);

        if(!product) {
            return res.status(404).json({message: "Product not found"});
        }

        if(product.image){
            const publicId = product.image.split("/").pop().split(".")[0];
            try {
                await cloudinary.uploader.destroy(`products/${publicId}`);
                console.log("Image deleted from cloudinary");
            } catch (error) {
                console.log("Error in deleting image from cloudinary",error);
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({message: "Product deleted successfully"});

    } catch (error) {
        console.log("Error in delete product controller",error);
        res.status(500).json({message: "Product deletion failed"});
    }
};

export const getRecommendedProducts = async (req,res) => {
    try {
        const products = await Product.aggregate([
            {
                $sample: {size:3}
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    price:1,
                    image:1
                }
            }
        ]) 

        res.json(products);
    } catch (error) {
        console.log("Error in get recommended products controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const getProductsByCategory = async (req,res) => {
    const category = req.params.category;
    try {
        const products = await Product.find({category});
        res.json(products);
    } catch (error) {
        console.log("Error in getProductsByCategory controller",error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const toggleFeaturedProduct = async (req,res) => {
    try {
        const product = await Product.findById(req.params.id);
        if(product){
            product.isFeatured = !product.isFeatured;
            const updatedProduct = await product.save();
            await updateFeaturedProductsCache();
            res.json(updatedProduct);
        }else{
            res.status(404).json({message: "Product not found"});
        }
    } catch (error) {
        console.log("Error in toggle featured product controller",error);
        res.status(500).json({message: "Internal server error"});
    }
}

async function updateFeaturedProductsCache() {
    try {
        const featuredProducts = await Product.find({isFeatured: true}).lean();
        await redis.set("featured_products", JSON.stringify(featuredProducts));
    } catch (error) {
        console.log("Error in updating featured products cache",error);
    }
}

