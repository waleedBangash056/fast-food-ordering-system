export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
}

export interface SeedModifierOption {
  id: string;
  name: string;
  priceDeltaMinor: number;
  isDefault: boolean;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface SeedModifierGroup {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: SeedModifierOption[];
}

export interface SeedMenuItem {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePriceMinor: number;
  imageUrl: string;
  isFeatured: boolean;
  displayOrder: number;
  calories: number;
  prepTimeMinutes: number;
  modifierGroups?: SeedModifierGroup[];
  isAvailable?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
}

export interface SeedBranch {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  deliveryFeeMinor: number;
  minOrderMinor: number;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    id: "cat-1",
    name: "Craft Burgers",
    slug: "burgers",
    description: "100% grass-fed Angus beef smashed crisp on hot steel, served on toasted brioche buns.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    displayOrder: 1,
  },
  {
    id: "cat-2",
    name: "Crispy Chicken",
    slug: "chicken",
    description: "24-hour buttermilk brined free-range chicken, double dredged and fried to golden perfection.",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80",
    displayOrder: 2,
  },
  {
    id: "cat-3",
    name: "Loaded Fries & Sides",
    slug: "sides",
    description: "Triple-cooked Idaho potatoes tossed with house seasonings and house-crafted melted cheeses.",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    displayOrder: 3,
  },
  {
    id: "cat-4",
    name: "Beverages & Shakes",
    slug: "beverages",
    description: "Thick hand-spun artisanal custards, fresh pressed lemonades, and craft sodas.",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
    displayOrder: 4,
  },
  {
    id: "cat-5",
    name: "Artisan Desserts",
    slug: "desserts",
    description: "Warm skillet cookies, hand-piped churros, and seasonal gelato sundaes.",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    displayOrder: 5,
  },
];

export const COMMON_MODIFIERS = {
  pattyCount: {
    id: "mod-patty",
    name: "Patty Selection",
    selectionType: "SINGLE" as const,
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0, isDefault: true },
      { id: "opt-double", name: "Double Patty (1/2 lb)", priceDeltaMinor: 350, isDefault: false },
      { id: "opt-triple", name: "Triple Patty (3/4 lb)", priceDeltaMinor: 650, isDefault: false },
    ],
  },
  cheese: {
    id: "mod-cheese",
    name: "Cheese Choice",
    selectionType: "SINGLE" as const,
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0, isDefault: true },
      { id: "opt-pepperjack", name: "Smoked Pepper Jack", priceDeltaMinor: 50, isDefault: false },
      { id: "opt-gouda", name: "Dutch Smoked Gouda", priceDeltaMinor: 100, isDefault: false },
      { id: "opt-nocheese", name: "No Cheese", priceDeltaMinor: 0, isDefault: false },
    ],
  },
  addons: {
    id: "mod-addons",
    name: "Premium Add-ons",
    selectionType: "MULTIPLE" as const,
    minSelections: 0,
    maxSelections: 4,
    isRequired: false,
    options: [
      { id: "opt-bacon", name: "Applewood Smoked Bacon", priceDeltaMinor: 200, isDefault: false },
      { id: "opt-avocado", name: "Hass Avocado Slices", priceDeltaMinor: 175, isDefault: false },
      { id: "opt-egg", name: "Crispy Sunny Egg", priceDeltaMinor: 150, isDefault: false },
      { id: "opt-jalapeno", name: "Pickled Candied Jalapeños", priceDeltaMinor: 75, isDefault: false },
    ],
  },
  heatLevel: {
    id: "mod-heat",
    name: "Spice Level",
    selectionType: "SINGLE" as const,
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0, isDefault: true },
      { id: "opt-heat-medium", name: "Medium Nashville Kick", priceDeltaMinor: 0, isDefault: false },
      { id: "opt-heat-hot", name: "Blazing Reaper Hot", priceDeltaMinor: 50, isDefault: false },
    ],
  },
  shakeFlavors: {
    id: "mod-shake-flavor",
    name: "Custard Flavor",
    selectionType: "SINGLE" as const,
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: "opt-flv-vanilla", name: "Madagascar Bourbon Vanilla", priceDeltaMinor: 0, isDefault: true },
      { id: "opt-flv-choc", name: "Valrhona Dark Chocolate", priceDeltaMinor: 0, isDefault: false },
      { id: "opt-flv-strawberry", name: "Wild Strawberry Puree", priceDeltaMinor: 50, isDefault: false },
      { id: "opt-flv-caramel", name: "Salted Caramel Pretzel", priceDeltaMinor: 75, isDefault: false },
    ],
  },
};

export const SEED_MENU_ITEMS: SeedMenuItem[] = [
  // Category 1: Burgers
  {
    id: "item-1",
    categoryId: "cat-1",
    name: "The Truffle Umami Smashed Burger",
    slug: "truffle-umami-burger",
    description: "Smashed Angus beef, black truffle aioli, sautéed wild porcini mushrooms, melted aged cheddar on a toasted brioche bun.",
    basePriceMinor: 1599,
    imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 1,
    calories: 890,
    prepTimeMinutes: 12,
    modifierGroups: [COMMON_MODIFIERS.pattyCount, COMMON_MODIFIERS.cheese, COMMON_MODIFIERS.addons],
  },
  {
    id: "item-2",
    categoryId: "cat-1",
    name: "Prime Bacon Cheddar Melt",
    slug: "prime-bacon-cheddar-melt",
    description: "Smashed prime beef, thick-cut applewood bacon, 18-month aged cheddar, caramelized shallots, house secret sauce.",
    basePriceMinor: 1449,
    imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 2,
    calories: 940,
    prepTimeMinutes: 10,
    modifierGroups: [COMMON_MODIFIERS.pattyCount, COMMON_MODIFIERS.cheese, COMMON_MODIFIERS.addons],
  },
  {
    id: "item-3",
    categoryId: "cat-1",
    name: "Firehouse Jalapeño Smash",
    slug: "firehouse-jalapeno-smash",
    description: "Seared beef, pepper jack cheese, candied jalapeños, habanero bacon jam, crispy fried onions, spicy chipotle crema.",
    basePriceMinor: 1399,
    imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 3,
    calories: 820,
    prepTimeMinutes: 11,
    modifierGroups: [COMMON_MODIFIERS.pattyCount, COMMON_MODIFIERS.addons],
  },
  {
    id: "item-4",
    categoryId: "cat-1",
    name: "The Classic Heritage Cheeseburger",
    slug: "classic-heritage-cheeseburger",
    description: "Single smash patty, American cheese, crisp bibb lettuce, ripe Roma tomato, tangy dill pickles, yellow mustard & ketchup.",
    basePriceMinor: 1199,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 4,
    calories: 680,
    prepTimeMinutes: 9,
    modifierGroups: [COMMON_MODIFIERS.pattyCount, COMMON_MODIFIERS.addons],
  },

  // Category 2: Crispy Chicken
  {
    id: "item-5",
    categoryId: "cat-2",
    name: "Nashville Hot Fried Chicken Sandwich",
    slug: "nashville-hot-chicken",
    description: "Buttermilk fried chicken breast drenched in cayenne chili oil, vinegar slaw, house pickles, garlic mayo on brioche.",
    basePriceMinor: 1349,
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 1,
    calories: 780,
    prepTimeMinutes: 12,
    modifierGroups: [COMMON_MODIFIERS.heatLevel, COMMON_MODIFIERS.addons],
  },
  {
    id: "item-6",
    categoryId: "cat-2",
    name: "Honey Glazed Gold Crispy Tenders",
    slug: "honey-glazed-tenders",
    description: "Four massive jumbo tenders tossed in hot hot-honey butter sauce, served with smoky ranch dip.",
    basePriceMinor: 1249,
    imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 2,
    calories: 710,
    prepTimeMinutes: 10,
    modifierGroups: [COMMON_MODIFIERS.heatLevel],
  },
  {
    id: "item-7",
    categoryId: "cat-2",
    name: "Smoked Bacon Ranch Crispy Club",
    slug: "bacon-ranch-crispy-club",
    description: "Golden chicken fillet, crispy bacon, Swiss cheese, fresh avocado, herb buttermilk ranch on a toasted potato roll.",
    basePriceMinor: 1429,
    imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 3,
    calories: 860,
    prepTimeMinutes: 12,
    modifierGroups: [COMMON_MODIFIERS.addons],
  },
  {
    id: "item-8",
    categoryId: "cat-2",
    name: "Korean Sweet & Spicy Crunch Sandwich",
    slug: "korean-crunch-sandwich",
    description: "Double-fried chicken breast glazed in sticky gochujang garlic sauce, pickled daikon radish, toasted sesame seeds.",
    basePriceMinor: 1399,
    imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 4,
    calories: 820,
    prepTimeMinutes: 11,
    modifierGroups: [COMMON_MODIFIERS.addons],
  },

  // Category 3: Loaded Fries & Sides
  {
    id: "item-9",
    categoryId: "cat-3",
    name: "Truffle Parmesan Hand-Cut Fries",
    slug: "truffle-parmesan-fries",
    description: "Crispy skin-on fries tossed in white truffle oil, freshly grated 24-month Parmigiano-Reggiano, chopped Italian parsley.",
    basePriceMinor: 749,
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 1,
    calories: 520,
    prepTimeMinutes: 6,
  },
  {
    id: "item-10",
    categoryId: "cat-3",
    name: "Loaded Animal-Style Smash Fries",
    slug: "loaded-animal-style-fries",
    description: "Fries smothered in seared ground beef, caramelized sweet onions, melted cheddar cheese sauce, and secret burger spread.",
    basePriceMinor: 899,
    imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 2,
    calories: 780,
    prepTimeMinutes: 8,
  },
  {
    id: "item-11",
    categoryId: "cat-3",
    name: "Beer-Battered Sweet Vidalia Onion Rings",
    slug: "beer-battered-onion-rings",
    description: "Thick-cut sweet Georgia onions in a crispy IPA beer batter, served with spicy remoulade dip.",
    basePriceMinor: 699,
    imageUrl: "https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 3,
    calories: 460,
    prepTimeMinutes: 7,
  },
  {
    id: "item-12",
    categoryId: "cat-3",
    name: "Crispy Mozzarella Stuffed Poppers",
    slug: "crispy-mozzarella-poppers",
    description: "Crisp golden bites of whole-milk mozzarella and charred jalapeño puree, served with warm marinara sauce.",
    basePriceMinor: 799,
    imageUrl: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 4,
    calories: 540,
    prepTimeMinutes: 7,
  },

  // Category 4: Beverages & Shakes
  {
    id: "item-13",
    categoryId: "cat-4",
    name: "Handcrafted Frozen Custard Shake",
    slug: "frozen-custard-shake",
    description: "Ultra-dense frozen custard spun with whole milk, topped with house whipped cream and shaved Belgian chocolate.",
    basePriceMinor: 699,
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 1,
    calories: 650,
    prepTimeMinutes: 5,
    modifierGroups: [COMMON_MODIFIERS.shakeFlavors],
  },
  {
    id: "item-14",
    categoryId: "cat-4",
    name: "Sparkling Blood Orange Basil Lemonade",
    slug: "blood-orange-basil-lemonade",
    description: "Freshly squeezed Meyer lemons, Sicilian blood orange reduction, infused with sweet organic basil and sparkling water.",
    basePriceMinor: 499,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 2,
    calories: 180,
    prepTimeMinutes: 3,
  },
  {
    id: "item-15",
    categoryId: "cat-4",
    name: "Cold Brew Espresso Float",
    slug: "cold-brew-espresso-float",
    description: "Single-origin Ethiopian cold brew coffee poured over a giant scoop of Madagascar vanilla bean gelato.",
    basePriceMinor: 649,
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 3,
    calories: 320,
    prepTimeMinutes: 4,
  },
  {
    id: "item-16",
    categoryId: "cat-4",
    name: "Artisanal Cane Sugar Cola",
    slug: "craft-cane-sugar-cola",
    description: "Micro-brewed small batch cola sweetened exclusively with fair-trade Mexican cane sugar.",
    basePriceMinor: 399,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 4,
    calories: 160,
    prepTimeMinutes: 2,
  },

  // Category 5: Artisan Desserts
  {
    id: "item-17",
    categoryId: "cat-5",
    name: "Warm Valrhona Chocolate Skillet Cookie",
    slug: "warm-chocolate-skillet-cookie",
    description: "Gooey freshly baked deep-dish chocolate chip cookie topped with salted caramel drizzle and Tahitian vanilla ice cream.",
    basePriceMinor: 849,
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    isFeatured: true,
    displayOrder: 1,
    calories: 720,
    prepTimeMinutes: 8,
  },
  {
    id: "item-18",
    categoryId: "cat-5",
    name: "Cinnamon Sugar Churro Bites",
    slug: "cinnamon-sugar-churros",
    description: "Golden fried Spanish churros tossed in Saigon cinnamon and organic cane sugar, served with warm dulce de leche dip.",
    basePriceMinor: 699,
    imageUrl: "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 2,
    calories: 510,
    prepTimeMinutes: 6,
  },
  {
    id: "item-19",
    categoryId: "cat-5",
    name: "Burnt Basque Cheesecake Slice",
    slug: "burnt-basque-cheesecake",
    description: "Caramelized dark exterior with a molten, ultra-creamy cream cheese center, drizzled with blackberry coulis.",
    basePriceMinor: 799,
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 3,
    calories: 490,
    prepTimeMinutes: 4,
  },
  {
    id: "item-20",
    categoryId: "cat-5",
    name: "Smoked Sea Salt Caramel Sundae",
    slug: "caramel-sundae",
    description: "Layers of velvety custard, crunchy butter toffee bits, warm dark chocolate fudge, and Maldon sea salt flakes.",
    basePriceMinor: 649,
    imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80",
    isFeatured: false,
    displayOrder: 4,
    calories: 580,
    prepTimeMinutes: 5,
  },
];

export const SEED_BRANCHES: SeedBranch[] = [
  {
    id: "branch-1",
    name: "Downtown Flagship",
    slug: "downtown-flagship",
    address: "742 Evergreen Blvd, Downtown",
    phone: "(555) 234-5678",
    email: "downtown@fastfoodbrand.com",
    latitude: "37.7749",
    longitude: "-122.4194",
    deliveryFeeMinor: 499,
    minOrderMinor: 1500,
  },
  {
    id: "branch-2",
    name: "Westside Express",
    slug: "westside-express",
    address: "1280 Ocean Parkway, West District",
    phone: "(555) 345-6789",
    email: "westside@fastfoodbrand.com",
    latitude: "37.7600",
    longitude: "-122.4800",
    deliveryFeeMinor: 599,
    minOrderMinor: 1800,
  },
  {
    id: "branch-3",
    name: "Uptown Plaza",
    slug: "uptown-plaza",
    address: "450 Heights Avenue, North Uptown",
    phone: "(555) 456-7890",
    email: "uptown@fastfoodbrand.com",
    latitude: "37.7950",
    longitude: "-122.4100",
    deliveryFeeMinor: 449,
    minOrderMinor: 1200,
  },
];

export interface SeedCoupon {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSubtotalMinor: number;
  maxDiscountMinor?: number;
  startsAt?: Date | string;
  expiresAt?: Date | string;
  isActive: boolean;
}

export const SEED_COUPONS: SeedCoupon[] = [
  {
    code: "WELCOME10",
    description: "10% off your order (up to $10)",
    discountType: "PERCENTAGE",
    discountValue: 1000, // 10.00%
    minSubtotalMinor: 1500,
    maxDiscountMinor: 1000, // $10.00 max cap
    startsAt: "2025-01-01T00:00:00Z",
    expiresAt: "2030-12-31T23:59:59Z",
    isActive: true,
  },
  {
    code: "FRIESFREE",
    description: "$4.99 off any order over $20",
    discountType: "FIXED_AMOUNT",
    discountValue: 499,
    minSubtotalMinor: 2000,
    startsAt: "2025-01-01T00:00:00Z",
    expiresAt: "2030-12-31T23:59:59Z",
    isActive: true,
  },
  {
    code: "CHEF20",
    description: "20% VIP Chef Discount",
    discountType: "PERCENTAGE",
    discountValue: 2000, // 20.00%
    minSubtotalMinor: 2500,
    maxDiscountMinor: 1500,
    startsAt: "2025-01-01T00:00:00Z",
    expiresAt: "2030-12-31T23:59:59Z",
    isActive: true,
  },
];
