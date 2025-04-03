// Import des packages
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary"); // Fichier Cloudinary

// Définition des types MIME
const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/tif": "tif",
  "image/webp": "webp",
};

// Configuration du stockage sur Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sauce_images", // Nom du dossier Cloudinary
    format: async (req, file) => MIME_TYPES[file.mimetype] || "webp", // Format d'image
    public_id: (req, file) => {
      const name = file.originalname.split(" ").join("_").split(".")[0]; // Nettoyer le nom
      return name + "_" + Date.now(); // Nom unique
    },
  },
});

// Export de multer avec Cloudinary
module.exports = multer({ storage: storage }).single("image");
