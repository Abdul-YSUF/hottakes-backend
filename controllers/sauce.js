// Import du fichier sauce depuis le dossier models
const Sauce = require("../models/Sauce");
// Import Cloudinary
const cloudinary = require("cloudinary").v2;

// Lecture de toutes les sauces dans la bdd (GET)
exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(404).json({ error }));
};

// Lecture d'une sauce avec son ID (GET)
exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

// Création d'une nouvelle sauce (POST)
exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject.id;
  delete sauceObject.userId;
  // Création nouvel objet sauce avec le model sauce
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    // Url de l'image enregistrée dans le dossier images backend et aussi dans la bdd
    imageUrl: req.file.path,
  });
  // Enregistrement de l'objet sauce dans la bdd
  sauce
    .save()
    .then(() => res.status(201).json({ message: "Sauce enregistrée" }))
    .catch((error) => res.status(400).json({ error }));
};

// Mise à jour de la modification d'une sauce (PUT)
exports.modifySauce = async (req, res, next) => {
  try {
    // Recherche de la sauce existante
    const sauce = await Sauce.findOne({ _id: req.params.id });

    // Vérification que l'utilisateur est bien le propriétaire de la sauce
    if (sauce.userId !== req.auth.userId) {
      return res.status(401).json({ error: "Requête non autorisée" });
    }

    let sauceObject;

    // Si une nouvelle image est envoyée
    if (req.file) {
      // Extraction de l'ID public de l'ancienne image Cloudinary
      const publicId = sauce.imageUrl.split("/").pop().split(".")[0];
      const publicIdWithFolder = `sauce_images/${publicId}`;

      // Suppression de l'ancienne image sur Cloudinary
      await cloudinary.uploader.destroy(publicIdWithFolder);

      // Création du nouvel objet sauce avec la nouvelle image Cloudinary
      sauceObject = {
        ...JSON.parse(req.body.sauce),
        imageUrl: req.file.path, // Nouvelle URL Cloudinary
      };
    } else {
      // Modification texte uniquement (pas d'image)
      sauceObject = { ...req.body };
    }

    // Suppression de l'ID utilisateur pour éviter les modifications non autorisées
    delete sauceObject.userId;

    // Mise à jour de la sauce dans la base de données
    await Sauce.updateOne(
      { _id: req.params.id },
      { ...sauceObject, _id: req.params.id }
    );

    res.status(200).json({ message: "Sauce modifiée avec succès !" });
  } catch (error) {
    res.status(400).json({ error });
  }
};

// Suppression d'une sauce (DELETE)
exports.deleteSauce = async (req, res, next) => {
  try {
    // Recherche de la sauce à supprimer
    const sauce = await Sauce.findOne({ _id: req.params.id });

    // Vérification si l'utilisateur a le droit de supprimer la sauce
    if (sauce.userId !== req.auth.userId) {
      return res.status(401).json({ error: "Requête non autorisée" });
    }

    // Récupération de l'ID public de l'image Cloudinary
    const publicId = sauce.imageUrl.split("/").pop().split(".")[0];
    const publicIdWithFolder = `sauce_images/${publicId}`;

    // Suppression de l'image de Cloudinary
    await cloudinary.uploader.destroy(publicIdWithFolder);

    // Suppression de la sauce dans la base de données
    await Sauce.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Sauce supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// Like ou Dislike
exports.likeOrDislike = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // Si l'utilisateur like la sauce
      if (
        !sauce.usersLiked.includes(req.auth.userId) &&
        !sauce.usersDisliked.includes(req.auth.userId) &&
        req.body.like === 1
      ) {
        // Ajouter 1 like et Envoie dans le tableau usersLiked
        Sauce.updateOne(
          { _id: req.params.id },
          { $inc: { likes: 1 }, $push: { usersLiked: req.auth.userId } }
        )
          .then(() => res.status(200).json({ message: "Like ajouté" }))
          .catch((error) => res.status(400).json({ error }));
      }
      // Enlève un like du tableau userLiked
      else if (
        sauce.usersLiked.includes(req.auth.userId) &&
        req.body.like === 0
      ) {
        Sauce.updateOne(
          { _id: req.params.id },
          { $inc: { likes: -1 }, $pull: { usersLiked: req.auth.userId } }
        )
          .then(() => {
            res.status(200).json({ message: "Like supprimé !" });
          })
          .catch((error) => res.status(400).json({ error }));
      }
      // Si l'utilisateur dislike la sauce
      else if (
        !sauce.usersDisliked.includes(req.auth.userId) &&
        !sauce.usersLiked.includes(req.auth.userId) &&
        req.body.like === -1
      ) {
        // Ajouter 1 dislike et Envoie dans le tableau usersDisliked
        Sauce.updateOne(
          { _id: req.params.id },
          { $inc: { dislikes: 1 }, $push: { usersDisliked: req.auth.userId } }
        )
          .then(() => res.status(200).json({ message: "Dislike ajouté !" }))
          .catch((error) => res.status(400).json({ error }));
      }
      // Enlève un dislike du tableau userDisliked
      else if (
        sauce.usersDisliked.includes(req.auth.userId) &&
        req.body.like === 0
      ) {
        Sauce.updateOne(
          { _id: req.params.id },
          { $inc: { dislikes: -1 }, $pull: { usersDisliked: req.auth.userId } }
        )
          .then(() => {
            res.status(200).json({ message: "Dislike supprimé !" });
          })
          .catch((error) => res.status(400).json({ error }));
      }
      // Vérifier que l'utilisateur ne peut faire la même action
      else if (
        sauce.usersLiked.includes(req.auth.userId) &&
        req.body.like === 1
      ) {
        res.status(400).json({
          error: "Utilisateur ne peut pas liker plusieurs fois la même sauce",
        });
      } else if (
        sauce.usersDisliked.includes(req.auth.userId) &&
        req.body.like === -1
      ) {
        res.status(400).json({
          error:
            "Utilisateur ne peut pas disliker plusieurs fois la même sauce",
        });
      } else {
        res.status(400).json({ error: "Action non autorisée" });
      }
    })
    .catch((error) => res.status(500).json({ error }));
};
