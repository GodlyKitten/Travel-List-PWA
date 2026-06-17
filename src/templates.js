import { newId } from './state.js';

export const TEMPLATE = {
  sections: [
    {
      name: 'Documents',
      items: [
        { text: "ID / Driver's license",    requires: {} },
        { text: 'Wallet',                   requires: {} },
        { text: 'Passport',                 requires: { destination: 'international' } },
        { text: 'Copies of documents',      requires: { destination: 'international' } },
        { text: 'Travel insurance info',    requires: { destination: 'international' } }
      ]
    },
    {
      name: 'Clothes',
      items: [
        { text: 'Underwear',                requires: {} },
        { text: 'Socks',                    requires: {} },
        { text: 'T-shirts',                 requires: {} },
        { text: 'Pants',                    requires: {} },
        { text: 'Sleepwear',                requires: {} },
        { text: 'Laundry bag',              requires: { duration: 'long' } }
      ]
    },
    {
      name: 'Toiletries',
      items: [
        { text: 'Toothbrush',               requires: {} },
        { text: 'Toothpaste',               requires: {} },
        { text: 'Deodorant',                requires: {} },
        { text: 'Shampoo',                  requires: { duration: 'long' } },
        { text: 'Body wash',                requires: { duration: 'long' } },
        { text: 'Skincare',                 requires: {} }
      ]
    },
    {
      name: 'Electronics',
      items: [
        { text: 'Phone charger',            requires: {} },
        { text: 'Headphones',               requires: {} },
        { text: 'Power bank',               requires: {} },
        { text: 'Travel adapter',           requires: { destination: 'international' } },
        { text: 'Voltage converter',        requires: { destination: 'international' } }
      ]
    },
    {
      name: 'Travel essentials',
      items: [
        { text: 'Boarding pass / tickets',  requires: {} },
        { text: 'Foreign currency / card',  requires: { destination: 'international' } },
        { text: 'Snacks',                   requires: {} },
        { text: 'Water bottle',             requires: {} }
      ]
    },
    {
      name: 'Extras',
      items: []
    }
  ]
};

function matches(requires, tripType) {
  return Object.entries(requires).every(([k, v]) => tripType[k] === v);
}

export function generateList(tripType) {
  return TEMPLATE.sections.map(section => ({
    name: section.name,
    items: section.items
      .filter(item => matches(item.requires, tripType))
      .map(item => ({
        id: newId(),
        text: item.text,
        checked: false,
        custom: false
      }))
  }));
}

export function resetGeneratedItems(list) {
  return generateList(list.tripType);
}
