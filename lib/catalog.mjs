import { themes, introQA } from '../app/data.js';

const base = { name: 'Expression orale', icon: 'mic', color: 'sage', axes: [], role: 'un examinateur' };
const opinions = [
  ['travail', 'Le télétravail pour tous ?', 'Pensez-vous que le télétravail devrait être proposé à tous les salariés ? Présentez votre point de vue et justifiez-le avec des exemples.', ['productivité', 'vie personnelle', 'relations professionnelles']],
  ['transport', 'Une ville sans voitures ?', 'Faut-il interdire les voitures dans les centres-villes ? Expliquez votre position, les avantages et les limites de cette mesure.', ['pollution', 'accessibilité', 'commerces']],
  ['association', 'Le bénévolat à l’école ?', 'Pensez-vous que les jeunes devraient faire du bénévolat pendant leurs études ? Justifiez votre réponse.', ['solidarité', 'emploi du temps', 'expérience']],
];
const ads = [
  ['atelier', 'Un atelier de cuisine ensemble', 'Atelier cuisine du monde — chaque samedi à 10 h, 25 € par personne, ingrédients inclus. Une première séance à moitié prix. Centre culturel du quartier.', ['Je ne sais pas cuisiner.', 'Je travaille parfois le samedi.', 'Cela coûte trop cher.']],
  ['velo', 'Au travail à vélo', 'Vélo-partage — abonnement mensuel à 20 €, stations près du métro, casque conseillé. Trajets de moins de 30 minutes inclus.', ['La route me fait peur.', 'Et quand il pleut ?', 'Je suis trop loin du bureau.']],
  ['benevolat', 'Un samedi solidaire', 'La banque alimentaire cherche des bénévoles le samedi de 9 h à 12 h. Formation sur place. Participation possible une fois par mois.', ['Je manque de temps.', 'Je ne connais personne.', 'Je ne sais pas comment aider.']],
];
export const seedTopics = [
  { ...base, id: 'tcf-1-presentation', format: 'tcf-1', title: 'Faisons connaissance', desc: 'Parlez de votre quotidien, de votre parcours et de vos projets.', context: 'Présentez-vous. Parlez de vos activités, de votre parcours et de vos projets. Répondez aux questions de l’examinateur.', qa: introQA },
  ...themes.map(t => ({ ...t, id: `tcf-2-${t.id}`, format: 'tcf-2' })),
  ...opinions.map(([id, title, context, axes]) => ({ ...base, id: `tcf-3-${id}`, format: 'tcf-3', title, context, axes, desc: 'Exprimez et défendez votre point de vue.', qa: [
    ['Quelle est votre position ?', 'À mon avis… Je pense que…', 'Annoncez clairement votre point de vue.'],
    ['Quel exemple concret pouvez-vous donner ?', 'Par exemple, dans ma ville…', 'Expliquez le lien entre cet exemple et votre argument.'],
    ['Y a-t-il des limites à votre position ?', 'Il est vrai que… Cependant…', 'Nuancez votre avis puis concluez.'],
  ] })),
  ...themes.filter(t => ['loisirs', 'transport', 'association'].includes(t.id)).map(t => ({ ...t, id: `tef-a-${t.id}`, format: 'tef-a', context: `Vous avez lu cette annonce : « ${t.title} — renseignements auprès de notre service d’accueil. » Vous appelez pour obtenir des informations. ${t.context}`, desc: 'À partir d’une annonce, téléphonez pour obtenir des renseignements.' })),
  ...ads.map(([id, title, ad, objections]) => ({ ...base, id: `tef-b-${id}`, format: 'tef-b', title, desc: 'Présentez une annonce et convainquez votre ami.', context: `Vous avez lu cette annonce : « ${ad} » Présentez-la à un ami et convainquez-le de participer avec vous. Répondez à ses objections.`, qa: objections.map(objection => ['Présentez un avantage concret de cette proposition.', objection, 'Reformulez cette objection, proposez une solution et expliquez un bénéfice pour votre ami.']) })),
];
