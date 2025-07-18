# Salut les collègues ! 👋

J'ai développé une application de benchmarking pour comparer les performances entre les APIs REST et GraphQL de ServiceNow. C'est un outil parfait pour comprendre concrètement les différences entre ces deux approches et voir GraphQL en action !

🚀 **Accès direct** : https://elosarldemo1.service-now.com/api/elosa/api_benchmark/home

## Pourquoi c'est intéressant ?

- **Voir GraphQL en pratique** : L'app génère automatiquement des requêtes GraphQL pour différents scénarios
- **Comparaison performance** : Temps de réponse, taille des payloads, nombre de requêtes
- **Cas d'usage concrets** : Dot-walking, requêtes multi-tables, optimisation mobile
- **Analyse détaillée** : Bouton "See Details" pour examiner chaque requête/réponse

## 🆕 Nouvelles fonctionnalités !

- **🔍 Console Live** : Suivi en temps réel des tests avec filtrage et recherche
- **🎉 Modal de célébration** : Animation de confettis et résumé complet à la fin des tests
- **📊 Explorateur de tests** : Naviguer et comprendre chaque scénario avec prévisualisation du code
- **⌨️ Raccourcis clavier** : Ctrl+F (recherche), Ctrl+E (export), Ctrl+K (effacer)
- **📱 Interface responsive** : Optimisé pour mobile et tablette

## Ce que vous allez découvrir

1. **Comment construire des requêtes GraphQL** pour ServiceNow
2. **Quand GraphQL excelle** (relations complexes, optimisation de bande passante)
3. **Où REST reste pertinent** (simplicité, caching, opérations CRUD simples)
4. **Impact réel sur les performances** selon les scénarios

## 🚀 Modes d'utilisation

### **Mode API Benchmark** (classique)
- Configuration des tests par catégorie
- Lancement de tests en lot
- Suivi en temps réel dans la console live
- Résultats avec modal de célébration

### **Mode Test Explorer** (nouveau !)
- Naviguez dans les 50+ scénarios de test
- Comprenez chaque test avec des descriptions détaillées
- Visualisez le code généré (REST et GraphQL)
- Lancez des tests individuels en un clic

L'outil est déployable sur n'importe quelle instance ServiceNow pour tester vos propres données et voir l'impact de la dette technique.

**🎯 Objectif** : Partager vos retours sur les différences que vous observez entre REST et GraphQL !

---

**📖 Guide complet disponible dans `docs/GUIDE_UTILISATION_DETAILLE.md`**