import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type CatalogCategory = 'rtu' | 'accessories' | 'drives';

interface CatalogSpec {
  label: string;
  value: string;
}

interface CatalogProduct {
  id: string;
  category: CatalogCategory;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  highlights: string[];
  specs: CatalogSpec[];
  applications: string[];
  related?: string[];
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent {
  private readonly whatsappPhoneNumber = '17867251404';

  constructor(private translate: TranslateService) {}

  searchTerm = '';
  appliedSearch = '';
  selectedCategory: CatalogCategory | 'all' = 'rtu';
  selectedProduct: CatalogProduct | null = null;

  readonly categories: { id: CatalogCategory | 'all'; labelKey: string; descriptionKey: string }[] = [
    {
      id: 'rtu',
      labelKey: 'CATALOG.CATEGORIES.RTU',
      descriptionKey: 'CATALOG.CATEGORIES.RTU_DESC'
    },
    {
      id: 'accessories',
      labelKey: 'CATALOG.CATEGORIES.ACCESSORIES',
      descriptionKey: 'CATALOG.CATEGORIES.ACCESSORIES_DESC'
    },
    {
      id: 'drives',
      labelKey: 'CATALOG.CATEGORIES.DRIVES',
      descriptionKey: 'CATALOG.CATEGORIES.DRIVES_DESC'
    },
    {
      id: 'all',
      labelKey: 'CATALOG.CATEGORIES.ALL',
      descriptionKey: 'CATALOG.CATEGORIES.ALL_DESC'
    }
  ];

  readonly products: CatalogProduct[] = [
    {
      id: 'rtu-t100',
      category: 'rtu',
      code: 'RTU-01',
      name: 'Serie T-100',
      subtitle: 'Modelo esencial para monitoreo masivo y telemetría básica',
      image: 'catalog/rtu/rtu-t100-cabinet.jpg',
      description: 'Solución de adquisición de datos de gran densidad, costo-eficiente y optimizada para operar como nodo recolector ultraeficiente. Transmite información hacia brokers MQTT o plataformas en la nube y permite monitorear múltiples sensores analógicos de forma simultánea en un diseño compacto de bajo consumo.',
      highlights: ['34 canales I/O', 'Diseño compacto', 'Bajo consumo', 'Telemetría básica de alta densidad'],
      specs: [
        { label: 'Controlador base', value: 'RevPi Core S (1GB RAM / 32GB eMMC)' },
        { label: 'Entradas digitales', value: '8 DI' },
        { label: 'Salidas digitales', value: '6 DO (relé)' },
        { label: 'Entradas analógicas', value: '16 AI (4-20 mA / 0-10V)' },
        { label: 'Salidas analógicas', value: '4 AO' },
        { label: 'Comunicaciones', value: 'RS485, Ethernet RJ45, USB A (2)' },
        { label: 'Protocolos', value: 'Modbus TCP, Modbus UDP, Modbus RTU, MQTT, OPC UA' },
        { label: 'Alimentación', value: '24 VDC' },
        { label: 'Temperatura de operación', value: '-25 °C hasta 55 °C' },
        { label: 'Certificaciones', value: 'Controlador IP20, EN 61131-2, RoHS, UL 61010-1 / caja de control IP65' },
        { label: 'Otros componentes', value: 'Fuente de alimentación 24 VDC, interruptor inteligente' }
      ],
      applications: [
        'Agroindustria y agricultura controlada: monitoreo de humedad, pH y temperatura en invernaderos comerciales.',
        'Gestión de aguas: estaciones de bombeo pequeñas, pozos profundos y niveles en tanques remotos.',
        'Facilities management: monitoreo ambiental HVAC y consumo en tableros secundarios.'
      ],
      related: ['RevPi Core S', 'RevPi AIO', 'RevPi DIO', 'Fuente 24 VDC', 'Interruptor inteligente']
    },
    {
      id: 'rtu-e200',
      category: 'rtu',
      code: 'RTU-02',
      name: 'Serie E-200',
      subtitle: 'Automatización y Edge Computing estándar',
      image: 'catalog/rtu/rtu-e200-cabinet.jpg',
      description: 'RTU industrial equilibrada para procesamiento local, control analógico preciso y separación de redes IT/OT. Ejecuta contenedores Docker, Node-RED y bases de datos ligeras, reduciendo latencia y costos de ancho de banda antes de enviar datos a la nube.',
      highlights: ['Control analógico preciso', 'Hardware avanzado', 'Procesamiento local', 'Separación IT/OT'],
      specs: [
        { label: 'Controlador base', value: 'RevPi Connect 5 (4GB RAM / 32GB eMMC), arquitectura Quad-core' },
        { label: 'Entradas y salidas analógicas', value: '4 AI, 2 RTD y 2 AO' },
        { label: 'Comunicaciones', value: 'Doble Gigabit Ethernet, Wi-Fi, Bluetooth, RS485 aislado, CAN FD, USB 3.2 y micro-HDMI' },
        { label: 'Protocolos', value: 'MQTT sobre TLS, OPC UA, HTTP/REST, Modbus TCP/RTU, CANopen, J1939, PROFINET, EtherCAT y Ethernet/IP vía CODESYS' },
        { label: 'Seguridad', value: 'TPM 2.0, doble watchdog por hardware, TLS/SSL, aislamiento galvánico e inmunidad eléctrica industrial' },
        { label: 'Plataforma IoT', value: 'Integración con Azure, AWS, Cumulocity, Node-RED y Docker' },
        { label: 'Alimentación', value: '24 VDC' },
        { label: 'Certificaciones', value: 'CE, UKCA, UL, RoHS, controlador IP20 / caja de control IP65' },
        { label: 'Otros componentes', value: 'Fuente de alimentación 24 VDC, interruptor inteligente' }
      ],
      applications: [
        'Alimentos y bebidas: control de temperatura y presión en marmitas, pasteurizadoras o tanques de mezcla.',
        'Manufactura discreta: telemetría OEE en máquinas CNC y celdas de ensamblaje.',
        'Logística y cadena de frío: monitoreo continuo en cavas industriales y centros refrigerados.'
      ],
      related: ['RevPi Connect 5', 'RevPi AIO', 'Fuente 24 VDC', 'Interruptor inteligente']
    },
    {
      id: 'rtu-e300',
      category: 'rtu',
      code: 'RTU-03',
      name: 'Serie E-300',
      subtitle: 'Control avanzado e IA local',
      image: 'catalog/rtu/rtu-e300-cabinet.jpg',
      description: 'Servidor de borde industrial con I/O duro y memoria ampliada para desplegar modelos de Machine Learning y Deep Learning directamente en campo. Diseñado para tomar decisiones autónomas en microsegundos sin depender de la nube.',
      highlights: ['Base de datos local', 'Procesamiento robusto', 'Modelos de IA', 'Control en tiempo real'],
      specs: [
        { label: 'Controlador base', value: 'RevPi Connect 5 (8GB RAM / 32GB eMMC)' },
        { label: 'Comunicaciones', value: 'Doble Gigabit Ethernet, Wi-Fi, Bluetooth, RS485 y CAN FD aislados, USB 3.2 y HDMI' },
        { label: 'Capacidad de campo', value: '14 entradas y 14 salidas digitales con PWM/contadores, 4 AI, 2 RTD y 2 AO' },
        { label: 'Sincronización tiempo real', value: 'Intercambio cíclico entre CPU y módulos I/O por PiBridge con ciclo típico de 5 a 10 ms' },
        { label: 'Protocolos', value: 'MQTT TLS, OPC UA, HTTP/REST, Modbus TCP/RTU, CANopen, J1939 e integración CODESYS' },
        { label: 'Alimentación', value: '24 VDC' },
        { label: 'Certificaciones', value: 'CE, UKCA, UL, RoHS, controlador IP20 / caja de control IP65' }
      ],
      applications: [
        'Automotriz y manufactura avanzada: integración con celdas robóticas e inspección de calidad.',
        'Minería y maquinaria pesada: mantenimiento predictivo por vibraciones en motores, compresores o bombas.',
        'Petróleo y gas midstream: control avanzado en estaciones de válvulas o compresión.'
      ],
      related: ['RevPi Connect 5 8GB', 'RevPi DIO', 'RevPi AIO', 'Caja de control IP65']
    },
    {
      id: 'rtu-w400',
      category: 'rtu',
      code: 'RTU-04',
      name: 'Serie W-400',
      subtitle: 'Concentrador IIoT inalámbrico y redes de área amplia',
      image: 'catalog/rtu/rtu-w400-cabinet.jpg',
      description: 'Cerebro central para redes de sensores distribuidos en grandes extensiones. Captura datos de cientos de nodos inalámbricos, los unifica, los enriquece con contexto de borde y los transmite de forma segura.',
      highlights: ['Largo alcance', 'Telemetría inalámbrica', 'Menor costo de instalación', 'Gateway IIoT seguro'],
      specs: [
        { label: 'Rol del sistema', value: 'Solución híbrida todo en uno: RTU avanzada, Edge Controller y Gateway IIoT seguro' },
        { label: 'Controlador', value: 'Características base del modelo E-300, sin módulos de expansión cableados' },
        { label: 'Protocolos', value: 'MQTT TLS, OPC UA, HTTP/REST, Modbus TCP y Modbus RTU' },
        { label: 'Opciones de gateway', value: 'G1100 WirelessHART y Dragino MS48-LR LoRaWAN' },
        { label: 'Gateway IIoT', value: 'Traducción Modbus a MQTT/OPC UA, motor de enrutamiento Edge, aislamiento galvánico, filtrado local y cifrado TLS/SSL extremo a extremo' }
      ],
      applications: [
        'Petróleo y gas upstream: monitoreo de cabezales de pozos en campos extensos donde el cableado es inviable.',
        'Smart cities: gateway central para alumbrado público, medidores residenciales o gestión de tráfico.',
        'Agricultura de precisión: concentración de cientos de nodos LoRaWAN en plantaciones extensivas.'
      ],
      related: ['Gateway WirelessHART', 'Gateway Dragino MS48-LR', 'Milesight UG56', 'LT-22222-L LoRa I/O Controller']
    },
    {
      id: 'rtu-cx',
      category: 'rtu',
      code: 'CUSTOM',
      name: 'Serie CX',
      subtitle: 'RTU personalizada armable según requerimiento',
      image: 'catalog/rtu/control-box.png',
      description: 'Modelo elástico y escalable, pensado como un lienzo de hardware y software. Evita sobredimensionar o subdimensionar la solución: el cliente obtiene exactamente la potencia, comunicaciones, puertos y arquitectura física que requiere su proceso.',
      highlights: ['Ingeniería a la medida', 'Arquitectura escalable', 'Optimización de presupuesto', 'Hardware agnóstico'],
      specs: [
        { label: 'Configuración', value: 'Variable según pliego de requerimientos' },
        { label: 'Arquitectura', value: 'Desde nodos remotos ultra-básicos hasta arquitecturas hiper-complejas' },
        { label: 'Hardware', value: 'Selección de controlador, módulos I/O, comunicaciones y envolvente según necesidad' },
        { label: 'Software', value: 'Protocolos, lógica de borde, integración cloud y dashboard según alcance del proyecto' },
        { label: 'Evaluación técnica', value: 'Se consideran el 100% de variables del proceso antes de definir la ficha final' }
      ],
      applications: [
        'Procesos industriales que quedan fuera de estándares comerciales.',
        'Proyectos con restricciones físicas, energéticas, ambientales o de comunicación.',
        'Migraciones, modernizaciones o pilotos donde se requiere arquitectura flexible.'
      ],
      related: ['RevPi Core S', 'RevPi Connect 5', 'Módulos I/O', 'Gateways industriales', 'Caja de control IP65']
    },
    {
      id: 'acc-revpi-core',
      category: 'accessories',
      code: 'ACC-01',
      name: 'RevPi Core S',
      subtitle: 'Controlador industrial compacto para nodos de telemetría',
      image: 'catalog/rtu/revpi-core-s.png',
      description: 'Unidad base compacta para adquisición y transmisión de datos en arquitecturas RTU de bajo consumo, con memoria eMMC industrial y compatibilidad con módulos de expansión Revolution Pi.',
      highlights: ['1GB RAM', '32GB eMMC', 'IP20', 'Base para RTU T-100'],
      specs: [
        { label: 'Memoria', value: '1GB RAM / 32GB eMMC' },
        { label: 'Uso recomendado', value: 'Telemetría básica, nodos recolectores y tableros compactos' },
        { label: 'Integración', value: 'Módulos I/O Revolution Pi y comunicación industrial' }
      ],
      applications: ['Nodos remotos', 'Tableros compactos', 'Telemetría de señales analógicas']
    },
    {
      id: 'acc-revpi-connect',
      category: 'accessories',
      code: 'ACC-02',
      name: 'RevPi Connect 5',
      subtitle: 'Controlador Edge para automatización industrial',
      image: 'catalog/rtu/revpi-connect.png',
      description: 'Controlador industrial de mayor capacidad para Edge Computing, separación de redes IT/OT e integración con protocolos industriales y plataformas IoT.',
      highlights: ['4GB u 8GB RAM', 'Docker / Node-RED', 'Doble Ethernet', 'TPM 2.0'],
      specs: [
        { label: 'Versiones', value: '4GB RAM / 32GB eMMC o 8GB RAM / 32GB eMMC' },
        { label: 'Conectividad', value: 'Ethernet, Wi-Fi, Bluetooth, RS485, CAN FD, USB 3.2 y HDMI' },
        { label: 'Uso recomendado', value: 'RTU E-200, E-300, W-400 y soluciones custom' }
      ],
      applications: ['Edge Computing', 'Control local', 'Integración IT/OT']
    },
    {
      id: 'acc-aio',
      category: 'accessories',
      code: 'ACC-03',
      name: 'RevPi AIO',
      subtitle: 'Módulo analógico 4AIN, 2RTD y 4AOUT',
      image: 'catalog/rtu/aio.png',
      description: 'Módulo de señales analógicas para instrumentación de campo, medición de variables de proceso y control de lazos en tableros industriales.',
      highlights: ['4 entradas analógicas', '2 entradas RTD', '4 salidas analógicas', 'Control de lazos'],
      specs: [
        { label: 'Entradas', value: '4 AI y 2 RTD' },
        { label: 'Salidas', value: '4 AO' },
        { label: 'Uso recomendado', value: 'Temperatura, presión, nivel, caudal y señales 4-20 mA / 0-10V' }
      ],
      applications: ['Instrumentación de proceso', 'Control analógico', 'Telemetría industrial']
    },
    {
      id: 'acc-dio',
      category: 'accessories',
      code: 'ACC-04',
      name: 'RevPi DIO',
      subtitle: 'Módulo digital 14IN / 14OUT',
      image: 'catalog/rtu/dio.png',
      description: 'Módulo para señales digitales de campo, estados operativos, alarmas, enclavamientos y control discreto dentro de arquitecturas RTU.',
      highlights: ['14 entradas digitales', '14 salidas digitales', 'PWM / contadores', 'PiBridge'],
      specs: [
        { label: 'Entradas', value: '14 DI' },
        { label: 'Salidas', value: '14 DO' },
        { label: 'Uso recomendado', value: 'Estados de equipos, alarmas, actuadores y control discreto' }
      ],
      applications: ['Alarmas', 'Control discreto', 'Estados operativos OEE']
    },
    {
      id: 'acc-gateways',
      category: 'accessories',
      code: 'ACC-05',
      name: 'Gateways industriales',
      subtitle: 'WirelessHART, LoRaWAN y pasarelas IIoT',
      image: 'catalog/rtu/gateway-wirelesshart.png',
      description: 'Conjunto de gateways para redes inalámbricas industriales y despliegues de sensores distribuidos. Incluye opciones WirelessHART, Dragino MS48-LR y Milesight UG56 para concentrar datos y llevarlos a plataformas IIoT.',
      highlights: ['WirelessHART', 'LoRaWAN', 'Modbus a MQTT/OPC UA', 'Cifrado TLS/SSL'],
      specs: [
        { label: 'Opciones', value: 'Gateway WirelessHART Microcyber, Dragino MS48-LR, Milesight UG56' },
        { label: 'Uso recomendado', value: 'Redes de sensores distribuidos, campos extensos y telemetría inalámbrica' },
        { label: 'Integración', value: 'RTU W-400 y soluciones custom' }
      ],
      applications: ['Pozos distribuidos', 'Smart cities', 'Agricultura extensiva']
    },
    {
      id: 'acc-power',
      category: 'accessories',
      code: 'ACC-06',
      name: 'Alimentación y protección',
      subtitle: 'Fuente 24 VDC e interruptor inteligente',
      image: 'catalog/rtu/power-supply.png',
      description: 'Componentes de soporte para tableros de control: fuente de alimentación 24 VDC e interruptor WiFi inteligente 1P+N AC90-240V 1-50A para funciones auxiliares y supervisión.',
      highlights: ['24 VDC', 'AC90-240V', 'Smart Life / Tuya', 'Tablero de control'],
      specs: [
        { label: 'Fuente', value: 'Fuente de alimentación 24 VDC' },
        { label: 'Interruptor', value: '1P+N AC90-240V 1-50A, Smart Life/Tuya APP' },
        { label: 'Uso recomendado', value: 'Alimentación y maniobra auxiliar en RTU y tableros compactos' }
      ],
      applications: ['Tableros RTU', 'Control auxiliar', 'Supervisión energética']
    },
    {
      id: 'drive-vfd-15hp',
      category: 'drives',
      code: 'VFD-15HP',
      name: 'Variador de Frecuencia 15HP',
      subtitle: 'Control de velocidad trifásico para bombeo y motores industriales',
      image: 'variador.png',
      description: 'Variador para control de torque y eficiencia energética en motores trifásicos. Integra protección contra sobrecargas y cortocircuitos, panel de operación y comunicación industrial para sistemas de bombeo, pozos y facilidades.',
      highlights: ['15HP', 'Trifásico', 'Modbus', 'Protección de motor'],
      specs: [
        { label: 'Potencia', value: '15HP' },
        { label: 'Entrada', value: 'Trifásica' },
        { label: 'Control', value: 'Velocidad y torque para motores industriales' },
        { label: 'Protección', value: 'Sobrecarga y cortocircuito' },
        { label: 'Comunicación', value: 'Integración con protocolos industriales como Modbus' }
      ],
      applications: ['Bombeo industrial', 'Control de motores', 'Pozos y facilidades', 'Ahorro energético']
    }
  ];

  get filteredProducts() {
    const search = this.appliedSearch.trim().toLowerCase();

    return this.products.filter(product => {
      const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      const matchesSearch = !search || this.getSearchText(product).includes(search);
      return matchesCategory && matchesSearch;
    });
  }

  get activeCategoryLabel() {
    const category = this.categories.find(item => item.id === this.selectedCategory);
    return category ? this.t(category.labelKey) : '';
  }

  selectCategory(category: CatalogCategory | 'all') {
    this.selectedCategory = category;
    this.selectedProduct = null;
  }

  applySearch() {
    this.appliedSearch = this.searchTerm;
    this.selectedProduct = null;
  }

  clearFilters() {
    this.searchTerm = '';
    this.appliedSearch = '';
    this.selectedCategory = 'rtu';
    this.selectedProduct = null;
  }

  openDetails(product: CatalogProduct) {
    this.selectedProduct = product;
  }

  closeDetails() {
    this.selectedProduct = null;
  }

  @HostListener('document:keydown.escape')
  closeDetailsWithEscape() {
    this.closeDetails();
  }

  requestInfo(product?: CatalogProduct) {
    const subject = product
      ? `${product.code} - ${product.name}`
      : this.activeCategoryLabel || this.t('CATALOG.WHATSAPP.GENERIC_SUBJECT');
    const message = `${this.t('CATALOG.WHATSAPP.GREETING')}\n\n${this.t('CATALOG.WHATSAPP.SUBJECT')}: ${subject}\n${this.t('CATALOG.WHATSAPP.NOTE')}`;
    const whatsappUrl = `https://wa.me/${this.whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private getSearchText(product: CatalogProduct) {
    return [
      product.code,
      product.name,
      product.subtitle,
      product.description,
      ...product.highlights,
      ...product.applications,
      ...(product.related ?? []),
      ...product.specs.flatMap(spec => [spec.label, spec.value])
    ].join(' ').toLowerCase();
  }

  private t(key: string) {
    const value = this.translate.instant(key);
    return typeof value === 'string' ? value : key;
  }
}
