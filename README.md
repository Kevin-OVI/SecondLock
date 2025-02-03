# SecondLock - Double authentification sécurisée

SecondLock est une application de double authentification (2FA) avec synchronisation sur plusieurs appareils.

## Fonctionnalités

- Génération de codes 2FA sécurisée
- Scan de QR code pour ajouter un compte facilement
- Synchronisation sur plusieurs appareils
- Interface responsive qui sert également de webapp sur mobile
- Données stockées chiffrées

## Installation

### Prérequis
- Frontend: Node.js 20+
- Backend: Python 3.12+

### Mise en place

1. Cloner le dépôt:
```bash
git clone https://github.com/Kevin-OVI/SecondLock.git
cd SecondLock
```

2. Mise en place du Backend :
```bash
cd server
mkdir logs
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python main.py
```

3. Mise en place du Frontend :
```bash
cd front
npm install
npm run dev
```

## Securité

- Tous les secrets de 2FA sont chiffrés avec un dérivé du mot de passe maître de l'utilisateur dans la base de données. Sans connexion de l'utilisateur, il est impossible de les déchiffrer.
- Les sessions de chaque utilisateur expirent au bout de 10 minutes.
