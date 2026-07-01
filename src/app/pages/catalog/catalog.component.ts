import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type StockStatus = 'available' | 'limited';
type SortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'name';

interface Product {
  id: number;
  nameKey: string;
  categoryKey: string;
  descriptionKey: string;
  longDescriptionKey: string;
  price: number;
  image: string;
  stock: StockStatus;
  tagsKeys: string[];
  applicationsKeys: string[];
  specs: {
    labelKey: string;
    valueKey: string;
  }[];
}

interface CartItem extends Product {
  quantity: number;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent {
  constructor(private translate: TranslateService) {}

  products: Product[] = [
    {
      id: 1,
      nameKey: 'CATALOG.PRODUCTS.VARIADOR.NAME',
      categoryKey: 'CATALOG.CATEGORIES.CONTROL_POWER',
      descriptionKey: 'CATALOG.PRODUCTS.VARIADOR.DESCRIPTION',
      longDescriptionKey: 'CATALOG.PRODUCTS.VARIADOR.LONG_DESCRIPTION',
      price: 450.00,
      image: 'variador.png',
      stock: 'available',
      tagsKeys: [
        'CATALOG.PRODUCTS.VARIADOR.TAGS.HP',
        'CATALOG.PRODUCTS.VARIADOR.TAGS.PHASE',
        'CATALOG.PRODUCTS.VARIADOR.TAGS.MODBUS'
      ],
      applicationsKeys: [
        'CATALOG.PRODUCTS.VARIADOR.APPLICATIONS.PUMPING',
        'CATALOG.PRODUCTS.VARIADOR.APPLICATIONS.MOTORS',
        'CATALOG.PRODUCTS.VARIADOR.APPLICATIONS.WELLS'
      ],
      specs: [
        { labelKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.POWER_LABEL', valueKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.POWER_VALUE' },
        { labelKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.INPUT_LABEL', valueKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.INPUT_VALUE' },
        { labelKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.PROTECTION_LABEL', valueKey: 'CATALOG.PRODUCTS.VARIADOR.SPECS.PROTECTION_VALUE' }
      ]
    },
    {
      id: 2,
      nameKey: 'CATALOG.PRODUCTS.CABLE.NAME',
      categoryKey: 'CATALOG.CATEGORIES.INDUSTRIAL_CABLING',
      descriptionKey: 'CATALOG.PRODUCTS.CABLE.DESCRIPTION',
      longDescriptionKey: 'CATALOG.PRODUCTS.CABLE.LONG_DESCRIPTION',
      price: 1200.00,
      image: 'cable.png',
      stock: 'limited',
      tagsKeys: [
        'CATALOG.PRODUCTS.CABLE.TAGS.LENGTH',
        'CATALOG.PRODUCTS.CABLE.TAGS.SUBAQUATIC',
        'CATALOG.PRODUCTS.CABLE.TAGS.PRESSURE'
      ],
      applicationsKeys: [
        'CATALOG.PRODUCTS.CABLE.APPLICATIONS.SUBMERGED',
        'CATALOG.PRODUCTS.CABLE.APPLICATIONS.OIL_WELLS',
        'CATALOG.PRODUCTS.CABLE.APPLICATIONS.CORROSIVE'
      ],
      specs: [
        { labelKey: 'CATALOG.PRODUCTS.CABLE.SPECS.LENGTH_LABEL', valueKey: 'CATALOG.PRODUCTS.CABLE.SPECS.LENGTH_VALUE' },
        { labelKey: 'CATALOG.PRODUCTS.CABLE.SPECS.USE_LABEL', valueKey: 'CATALOG.PRODUCTS.CABLE.SPECS.USE_VALUE' },
        { labelKey: 'CATALOG.PRODUCTS.CABLE.SPECS.JACKET_LABEL', valueKey: 'CATALOG.PRODUCTS.CABLE.SPECS.JACKET_VALUE' }
      ]
    }
  ];

  searchTerm = '';
  selectedCategory = 'all';
  selectedStock: StockStatus | 'all' = 'all';
  sortBy: SortOption = 'featured';
  selectedProduct: Product | null = null;
  cart: CartItem[] = [];
  isCartOpen = false;

  get categories() {
    return ['all', ...new Set(this.products.map(product => product.categoryKey))];
  }

  get categoryCount() {
    return this.categories.length - 1;
  }

  get filteredProducts() {
    const search = this.searchTerm.trim().toLowerCase();

    const result = this.products.filter(product => {
      const matchesSearch = !search || this.getProductSearchText(product).toLowerCase().includes(search);
      const matchesCategory = this.selectedCategory === 'all' || product.categoryKey === this.selectedCategory;
      const matchesStock = this.selectedStock === 'all' || product.stock === this.selectedStock;

      return matchesSearch && matchesCategory && matchesStock;
    });

    return [...result].sort((a, b) => {
      if (this.sortBy === 'priceAsc') return a.price - b.price;
      if (this.sortBy === 'priceDesc') return b.price - a.price;
      if (this.sortBy === 'name') return this.t(a.nameKey).localeCompare(this.t(b.nameKey));
      return a.id - b.id;
    });
  }

  get activeFilterCount() {
    return [
      this.searchTerm.trim(),
      this.selectedCategory !== 'all',
      this.selectedStock !== 'all',
      this.sortBy !== 'featured'
    ].filter(Boolean).length;
  }

  get cartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  get cartCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  openDetails(product: Product) {
    this.selectedProduct = product;
  }

  closeDetails() {
    this.selectedProduct = null;
  }

  addToCart(product: Product) {
    const existingItem = this.cart.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    this.isCartOpen = true;
  }

  decreaseQuantity(productId: number) {
    const existingItem = this.cart.find(item => item.id === productId);
    if (!existingItem) return;

    if (existingItem.quantity === 1) {
      this.removeFromCart(productId);
      return;
    }

    existingItem.quantity--;
  }

  removeFromCart(productId: number) {
    this.cart = this.cart.filter(item => item.id !== productId);
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.selectedStock = 'all';
    this.sortBy = 'featured';
  }

  toggleCart() {
    this.isCartOpen = !this.isCartOpen;
  }

  getCategoryLabel(categoryKey: string) {
    return categoryKey === 'all' ? this.t('CATALOG.FILTERS.ALL_CATEGORIES') : this.t(categoryKey);
  }

  getStockLabel(stock: StockStatus) {
    return this.t(stock === 'available' ? 'CATALOG.STOCK.AVAILABLE' : 'CATALOG.STOCK.LIMITED');
  }

  getTranslatedProductName(product: Product) {
    return this.t(product.nameKey);
  }

  getTranslatedCategory(product: Product) {
    return this.t(product.categoryKey);
  }

  checkoutWhatsapp() {
    let message = `${this.t('CATALOG.WHATSAPP.GREETING')}\n\n`;

    this.cart.forEach(item => {
      message += `- ${item.quantity}x ${this.getTranslatedProductName(item)} ($${item.price})\n`;
    });

    message += `\n*${this.t('CATALOG.WHATSAPP.TOTAL_LABEL')}:* $${this.cartTotal}`;

    const whatsappUrl = `https://w.app/liftenergygroup?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private getProductSearchText(product: Product) {
    return [
      product.nameKey,
      product.categoryKey,
      product.descriptionKey,
      product.longDescriptionKey,
      ...product.tagsKeys,
      ...product.applicationsKeys,
      ...product.specs.flatMap(spec => [spec.labelKey, spec.valueKey])
    ].map(key => this.t(key)).join(' ');
  }

  private t(key: string) {
    const value = this.translate.instant(key);
    return typeof value === 'string' ? value : key;
  }
}
