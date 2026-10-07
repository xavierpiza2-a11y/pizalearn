# PizaLearn 🍕📚 - Guide de Déploiement Complet sur Freebox VM

Application web EdTech full-stack, auto-hébergée (self-hosted) et responsive pour les élèves de 11 à 17 ans (collège & lycée). Elle permet de réviser les cours en analysant les photos de cahiers/manuels via OCR et IA multimodale, avec génération instantanée de mini-jeux (QCM, Textes à trous, Vrai/Faux, Flashcards 3D, Association de paires).

---

## 🔑 1. Identifiants de Sécurité

- **Clé de sécurité globale de l'application :** `PIZA-HOUSE`  
  *(Protège l'accès à l'application. Aucune page n'est accessible tant que cette clé n'est pas saisie).*
- **Code PIN Superviseur / Administration d'origine :** `000000`  
  *(Strictement 6 zéros par défaut. Peut être modifié à tout moment depuis l'Espace Superviseur > Modèles IA & Sauvegarde).*

---

## 🤖 2. Où et comment configurer la Clé API de l'IA

### 📍 Quel fichier modifier ?
Le fichier à configurer est le fichier **`.env`** situé **à la racine du dossier de l'application** :
```text
/chemin/vers/pizalearn/.env
```

### 📝 Où mettre la clé exactement ?
Ouvrez le fichier `.env` avec un éditeur de texte (ex: `nano .env`) et renseignez votre clé sur la ligne suivante :
```env
# Clé API Google Gemini pour l'OCR et la génération des quiz
GEMINI_API_KEY="AIzaSyVotreCleApiReelleIci"
```

> **Comment obtenir une clé gratuitement ?**
> 1. Rendez-vous sur [Google AI Studio](https://aistudio.google.com/app/apikey).
> 2. Connectez-vous avec votre compte Google.
> 3. Cliquez sur **"Create API Key"** et copiez la clé générée (commence par `AIzaSy...`).
> 4. Collez-la entre les guillemets dans votre fichier `.env`.

*(Note : Même sans clé configurée immédiatement, l'application fonctionne avec les cours exemples pré-enregistrés en local).*

---

## 📦 3. Guide de Déploiement de A à Z sur Freebox (VM Debian / Ubuntu)

Ce tutoriel s'applique aux **Freebox Delta**, **Freebox Ultra** et tout modèle compatible avec les Machines Virtuelles de **Freebox OS**.

### Étape 1 : Préparer le stockage sur la Freebox
1. Vérifiez qu'un disque dur interne, un SSD M.2 ou un disque USB externe est branché sur votre Freebox.
2. Ouvrez votre navigateur et connectez-vous à l'interface Freebox :
   ```text
   http://mafreebox.freebox.fr/
   ```
3. Connectez-vous avec votre mot de passe administrateur Freebox.

---

### Étape 2 : Créer la Machine Virtuelle (VM)
1. Sur le bureau de Freebox OS, double-cliquez sur **"Gestion des VM"**.
2. Cliquez sur **"Ajouter une VM"**.
3. Remplissez les informations suivantes :
   - **Nom de la VM :** `pizalearn-vm`
   - **Choisir un système pré-installé :** Sélectionnez **Debian 12 (Bookworm)** ou **Ubuntu Server**.
   - **vCPU :** 1 ou 2 cœurs.
   - **Mémoire RAM :** Allouez au minimum **1024 Mo (1 Go)**, idéalement **1536 Mo ou 2048 Mo**.
   - **Nom d'utilisateur :** `freebox` (ou `debian`)
   - **Mot de passe :** Choisissez un mot de passe sécurisé.
4. Cliquez sur **Créer**. La Freebox télécharge l'image et prépare la machine.
5. Une fois prête, cliquez sur le bouton **"Allumer"** (icône Power verte).

---

### Étape 3 : Trouver l'adresse IP locale de la VM et fixer le bail DHCP
1. Dans Freebox OS, ouvrez **"Périphériques réseau"**.
2. Repérez votre VM (`pizalearn-vm`). Notez son adresse IP locale (par exemple : `192.168.1.50`).
3. *(Optionnel mais fortement recommandé)* :
   - Allez dans **Paramètres de la Freebox** > **Mode Avancé** > **DHCP** > onglet **Baux statiques**.
   - Ajoutez un bail statique pour que la VM conserve toujours la même IP locale (`192.168.1.50`).

---

### Étape 4 : Se connecter en SSH à la VM
Depuis votre ordinateur (Terminal sous macOS/Linux ou invite PowerShell sous Windows) :
```bash
ssh freebox@192.168.1.50
```
*(Remplacez `freebox` par votre nom d'utilisateur et `192.168.1.50` par l'IP de votre VM. Entrez le mot de passe défini à l'étape 2).*

---

### Étape 5 : Installer les dépendances système (Docker & Git)
Une fois connecté au terminal de la VM, lancez les commandes suivantes :

1. **Mise à jour des paquets du système :**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Installation des outils de base :**
   ```bash
   sudo apt install -y curl git ufw ca-certificates gnupg
   ```

3. **Installation automatique de Docker et Docker Compose :**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

4. **Permettre d'exécuter Docker sans sudo :**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

5. **Vérifier l'installation de Docker :**
   ```bash
   docker --version
   docker compose version
   ```

---

### Étape 6 : Récupérer le code de PizaLearn et le configurer
1. **Créer le dossier de l'application :**
   ```bash
   mkdir -p ~/apps && cd ~/apps
   ```

2. **Télécharger ou cloner le projet :**
   ```bash
   git clone <URL_DE_VOTRE_DEPOT_GIT> pizalearn
   cd pizalearn
   ```
   *(Si vous n'utilisez pas Git, vous pouvez transférer les fichiers du projet via `scp` ou `sftp`).*

3. **Créer et configurer le fichier d'environnement `.env` :**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Modifier le fichier `.env` avec votre clé API :**
   ```env
   # Renseignez ici votre clé Google Gemini obtenue sur Google AI Studio
   GEMINI_API_KEY="AIzaSyVotreCleApiReelleIci"

   # URL d'accès (locale ou externe)
   APP_URL="http://192.168.1.50:3000"

   # Code PIN initial du panneau superviseur (000000 par défaut)
   ADMIN_PIN="000000"
   ```
   *Pour sauvegarder dans `nano` : appuyez sur `Ctrl+O`, puis `Entrée`, et quittez avec `Ctrl+X`.*

---

### Étape 7 : Lancement de l'application via Docker Compose
Toujours dans le dossier `~/apps/pizalearn`, exécutez la commande unique :
```bash
docker compose up -d --build
```

- Docker compile l'application Node.js/TypeScript/React et démarre le serveur.
- Le paramètre `-d` permet à l'application de tourner en arrière-plan (daemon), même si vous fermez votre terminal SSH.
- Le volume persistant `./data` est automatiquement créé pour stocker la base de données locale (`db.json`) et les photos téléversées (`data/uploads`).

**Pour surveiller les logs de l'application :**
```bash
docker compose logs -f
```

---

### Étape 8 : Tester l'accès en réseau local (Wi-Fi de la maison)
Depuis n'importe quel ordinateur, smartphone ou tablette connecté au Wi-Fi de votre Freebox :
1. Ouvrez votre navigateur web (Safari, Chrome, Firefox).
2. Rendez-vous sur l'adresse :
   ```text
   http://192.168.1.50:3000
   ```
3. L'écran de verrouillage s'affiche.
4. Saisissez la clé globale : **`PIZA-HOUSE`**.
5. Vous êtes connecté !

---

### Étape 9 : Configurer l'accès en ligne depuis l'extérieur (4G/5G / Extérieur)
Pour que vos enfants puissent réviser depuis le collège, le lycée ou en déplacement :

1. Retournez dans **Freebox OS** (`http://mafreebox.freebox.fr/`).
2. Ouvrez **Paramètres de la Freebox** > **Mode Avancé** > **Gestion des ports**.
3. Cliquez sur **"Ajouter une redirection"** :
   - **IP destination :** L'adresse IP de votre VM (ex: `192.168.1.50`)
   - **Port de début WAN :** `3000` (ou un port libre de votre choix)
   - **Port de fin WAN :** `3000`
   - **Port de destination (LAN) :** `3000`
   - **Protocole :** `TCP`
   - **Commentaire :** `PizaLearn EdTech`
4. Cliquez sur **Sauvegarder**.

#### Quel lien utiliser depuis l'extérieur ?
- Avec votre adresse IP publique Freebox :  
  `http://VOTRE_IP_PUBLIQUE_FREEBOX:3000`  
  *(Vous pouvez voir votre IP publique dans Freebox OS > État de la Freebox).*
- Ou avec le nom de domaine gratuit Freebox OS :  
  Freebox OS fournit un nom personnalisé dans **Paramètres** > **Nom de domaine** (ex: `http://mon-domaine.freeboxos.fr:3000`).

---

## 🔒 4. Administration & Maintenance

### Modifier le code PIN Superviseur
1. Dans l'application, cliquez sur l'onglet **"Superviseur"** dans la barre de navigation.
2. Entrez le PIN d'origine : `000000`.
3. Rendez-vous sur l'onglet **"Modèles IA & Sauvegarde"**.
4. Dans le bloc **"Sécurité Superviseur (Code PIN)"** :
   - Saisissez le PIN actuel (`000000`).
   - Saisissez votre nouveau code à 6 chiffres.
   - Confirmez et validez.
   - Le code est instantanément mis à jour dans `data/db.json`.

### Sauvegarder ou Restaurer les cours
- Dans l'onglet **"Modèles IA & Sauvegarde"**, cliquez sur **"Télécharger la sauvegarde complète (JSON)"**.
- Vous obtenez un fichier `pizalearn-backup.json` contenant l'intégralité des cours analysés, profils d'élèves, badges et historiques de révision.
- En cas de réinstallation, importez simplement ce fichier via le bouton **"Restaurer une sauvegarde (JSON)"**.

### Arrêter ou Mettre à jour l'application
```bash
cd ~/apps/pizalearn

# Arrêter l'application
docker compose down

# Mettre à jour et redémarrer
git pull
docker compose up -d --build
```
