import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type StockStatus = 'available' | 'limited' | 'draft';
type SortOption = 'updated' | 'priceAsc' | 'priceDesc' | 'name';

interface AdminProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  longDescription: string;
  image: string;
  stock: StockStatus;
  tags: string;
  applications: string;
  specs: string;
  updatedAt: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  isModalOpen = false;
  isEditing = false;
  searchTerm = '';
  selectedCategory = 'all';
  selectedStock: StockStatus | 'all' = 'all';
  sortBy: SortOption = 'updated';

  products: AdminProduct[] = [
    {
      id: 1,
      name: 'Variador de Frecuencia 15HP',
      category: 'Control y potencia',
      price: 450,
      description: 'Controlador de velocidad trifasico ideal para sistemas de bombeo industrial.',
      longDescription: 'Variador de frecuencia para control de torque, proteccion por sobrecarga e integracion industrial mediante protocolos de comunicacion.',
      image: 'variador.png',
      stock: 'available',
      tags: '15HP, Trifasico, Modbus',
      applications: 'Bombeo industrial, Control de motores, Pozos y facilidades',
      specs: 'Potencia: 15HP | Entrada: Trifasica | Proteccion: Sobrecarga',
      updatedAt: '2026-07-01'
    },
    {
      id: 2,
      name: 'Cable de Potencia Subacuatico',
      category: 'Cableado industrial',
      price: 1200,
      description: 'Rollo de 100m resistente a altas presiones y entornos corrosivos.',
      longDescription: 'Cable de potencia para inmersion profunda con cubierta de polimero reforzado y resistencia a ambientes corrosivos.',
      image: 'cable.png',
      stock: 'limited',
      tags: '100m, Subacuatico, Alta presion',
      applications: 'Instalacion sumergible, Pozos petroleros, Ambientes corrosivos',
      specs: 'Longitud: 100m | Uso: Subacuatico | Cubierta: Polimero reforzado',
      updatedAt: '2026-07-01'
    }
  ];

  currentProduct: AdminProduct = this.createEmptyProduct();

  get categories() {
    return ['all', ...new Set(this.products.map(product => product.category))];
  }

  get filteredProducts() {
    const search = this.searchTerm.trim().toLowerCase();

    const result = this.products.filter(product => {
      const searchableText = [
        product.name,
        product.category,
        product.description,
        product.longDescription,
        product.tags,
        product.applications,
        product.specs
      ].join(' ').toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);
      const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      const matchesStock = this.selectedStock === 'all' || product.stock === this.selectedStock;

      return matchesSearch && matchesCategory && matchesStock;
    });

    return [...result].sort((a, b) => {
      if (this.sortBy === 'priceAsc') return a.price - b.price;
      if (this.sortBy === 'priceDesc') return b.price - a.price;
      if (this.sortBy === 'name') return a.name.localeCompare(b.name);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  get activeFilterCount() {
    return [
      this.searchTerm.trim(),
      this.selectedCategory !== 'all',
      this.selectedStock !== 'all',
      this.sortBy !== 'updated'
    ].filter(Boolean).length;
  }

  get availableCount() {
    return this.products.filter(product => product.stock === 'available').length;
  }

  get limitedCount() {
    return this.products.filter(product => product.stock === 'limited').length;
  }

  get draftCount() {
    return this.products.filter(product => product.stock === 'draft').length;
  }

  get inventoryValue() {
    return this.products.reduce((total, product) => total + product.price, 0);
  }

  openAddModal() {
    this.isEditing = false;
    this.currentProduct = this.createEmptyProduct();
    this.isModalOpen = true;
  }

  editProduct(product: AdminProduct) {
    this.isEditing = true;
    this.currentProduct = { ...product };
    this.isModalOpen = true;
  }

  deleteProduct(id: number) {
    if (confirm('¿Eliminar este equipo definitivamente?')) {
      this.products = this.products.filter(product => product.id !== id);
    }
  }

  saveProduct() {
    const productToSave = {
      ...this.currentProduct,
      price: Number(this.currentProduct.price),
      updatedAt: this.getToday()
    };

    if (this.isEditing) {
      this.products = this.products.map(product => product.id === productToSave.id ? productToSave : product);
    } else {
      this.products = [{ ...productToSave, id: Date.now() }, ...this.products];
    }

    this.isModalOpen = false;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.selectedStock = 'all';
    this.sortBy = 'updated';
  }

  closeModal() {
    this.isModalOpen = false;
  }

  getStockLabel(stock: StockStatus) {
    if (stock === 'available') return 'En stock';
    if (stock === 'limited') return 'Stock limitado';
    return 'Borrador';
  }

  getStockClass(stock: StockStatus) {
    if (stock === 'available') return 'bg-lime-300/15 text-lime-200 border-lime-300/25';
    if (stock === 'limited') return 'bg-amber-300/15 text-amber-200 border-amber-300/25';
    return 'bg-slate-300/15 text-slate-200 border-slate-300/25';
  }

  getTagList(product: AdminProduct) {
    return product.tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  private createEmptyProduct(): AdminProduct {
    return {
      id: 0,
      name: '',
      category: 'Control y potencia',
      price: 0,
      description: '',
      longDescription: '',
      image: 'variador.png',
      stock: 'draft',
      tags: '',
      applications: '',
      specs: '',
      updatedAt: this.getToday()
    };
  }

  private getToday() {
    return new Date().toISOString().slice(0, 10);
  }
}
