export const skillActivities = {
  TCF: {
    reading: { id: 'tcf-reading-1', title: 'Une médiathèque plus accessible', text: 'À partir du mois prochain, la médiathèque ouvrira le dimanche matin. Cette décision répond aux demandes des étudiants et des familles qui ne peuvent pas venir en semaine. Un espace silencieux sera réservé au travail individuel.', question: 'Pourquoi les horaires changent-ils ?', choices: ['Pour organiser des concerts', 'Pour répondre aux besoins du public', 'Pour fermer en semaine'], answer: 1 },
    listening: { id: 'tcf-listening-1', title: 'Un changement de rendez-vous', text: 'Bonjour Madame Martin. Votre rendez-vous de mardi à quatorze heures est déplacé à mercredi matin à neuf heures trente. Merci de nous rappeler si ce nouvel horaire ne vous convient pas.', question: 'Quand aura lieu le rendez-vous ?', choices: ['Mardi à 14 h', 'Mercredi à 9 h 30', 'Mercredi à 14 h'], answer: 1 },
    writing: { id: 'tcf-writing-1', title: 'Proposer une activité', prompt: 'Vous écrivez à un ami pour lui proposer une activité ce week-end. Expliquez le programme, le lieu et l’heure du rendez-vous.', minimum: 60 },
  },
  TEF: {
    reading: { id: 'tef-reading-1', title: 'Un service de vélos', text: 'La ville lance un abonnement annuel de vélos en libre-service. Les trente premières minutes sont gratuites. Une réduction est proposée aux moins de vingt-cinq ans sur présentation d’un justificatif.', question: 'Qui peut bénéficier d’un tarif réduit ?', choices: ['Tous les habitants', 'Les moins de 25 ans avec justificatif', 'Les touristes uniquement'], answer: 1 },
    listening: { id: 'tef-listening-1', title: 'Une annonce en gare', text: 'Le train à destination de Lyon partira exceptionnellement de la voie douze avec un retard estimé de quinze minutes. Les voyageurs sont invités à vérifier les écrans d’affichage.', question: 'Que doivent faire les voyageurs ?', choices: ['Changer de gare', 'Demander un remboursement', 'Vérifier les écrans'], answer: 2 },
    writing: { id: 'tef-writing-1', title: 'Réagir à un projet local', prompt: 'Le journal de votre quartier annonce la transformation d’un parking en jardin public. Écrivez pour donner votre opinion et la justifier avec des exemples.', minimum: 80 },
  },
};
