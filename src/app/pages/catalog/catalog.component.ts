import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type * as ThreeNamespace from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';

type CatalogCategory = 'rtu' | 'accessories' | 'drives' | 'cameras' | 'flow' | 'temperature' | 'pressure';

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
  datasheetUrl?: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements AfterViewInit, OnDestroy {
  private readonly whatsappPhoneNumber = '17867251404';
  private readonly pumpjackModelUrl = '/models/pumpjack.glb';
  private previousBodyStyles = {
    overflow: '',
    position: '',
    top: '',
    left: '',
    right: '',
    width: ''
  };
  private previousDocumentOverflow = '';
  private lockedScrollY = 0;
  private isBodyScrollLocked = false;

  @ViewChild('pumpjackCanvas') private pumpjackCanvas?: ElementRef<HTMLCanvasElement>;

  private three?: typeof ThreeNamespace;
  private pumpjackScene?: ThreeNamespace.Scene;
  private pumpjackCamera?: ThreeNamespace.PerspectiveCamera;
  private pumpjackRenderer?: ThreeNamespace.WebGLRenderer;
  private pumpjackControls?: OrbitControlsType;
  private pumpjackResizeObserver?: ResizeObserver;
  private pumpjackAnimationFrame = 0;

  constructor(
    private translate: TranslateService,
    private ngZone: NgZone
  ) {}

  searchTerm = '';
  selectedCategory: CatalogCategory | 'all' = 'rtu';
  selectedProduct: CatalogProduct | null = null;
  isProductImageZoomed = false;
  productImageLensLeft = 0;
  productImageLensTop = 0;
  productImageLensImageWidth = 0;
  productImageLensImageHeight = 0;
  productImageLensImageLeft = 0;
  productImageLensImageTop = 0;
  private readonly productImageLensRadius = 72;
  private readonly productImageLensZoom = 2.8;

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      queueMicrotask(() => this.initPumpjackScene());
    });
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    this.destroyPumpjackScene();
  }

  readonly categories: { id: CatalogCategory | 'all'; labelKey: string; filterLabelKey: string }[] = [
    {
      id: 'rtu',
      labelKey: 'CATALOG.CATEGORIES.RTU',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_RTU'
    },
    {
      id: 'accessories',
      labelKey: 'CATALOG.CATEGORIES.ACCESSORIES',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_ACCESSORIES'
    },
    /* Variadores ocultos temporalmente hasta contar con información técnica real.
    {
      id: 'drives',
      labelKey: 'CATALOG.CATEGORIES.DRIVES',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_DRIVES'
    }, */
    {
      id: 'cameras',
      labelKey: 'CATALOG.CATEGORIES.CAMERAS',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_CAMERAS'
    },
    {
      id: 'flow',
      labelKey: 'CATALOG.CATEGORIES.FLOW',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_FLOW'
    },
    {
      id: 'temperature',
      labelKey: 'CATALOG.CATEGORIES.TEMPERATURE',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_TEMPERATURE'
    },
    {
      id: 'pressure',
      labelKey: 'CATALOG.CATEGORIES.PRESSURE',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_PRESSURE'
    },
    {
      id: 'all',
      labelKey: 'CATALOG.CATEGORIES.ALL',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_ALL'
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
      related: ['RevPi Core S', 'RevPi AIO', 'RevPi DIO', 'Fuente 24 VDC', 'Interruptor inteligente'],
      datasheetUrl: '/docs/catalog/rtu/RTU-01.pdf'
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
      related: ['RevPi Connect 5', 'RevPi AIO', 'Fuente 24 VDC', 'Interruptor inteligente'],
      datasheetUrl: '/docs/catalog/rtu/RTU-02.pdf'
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
      related: ['RevPi Connect 5 8GB', 'RevPi DIO', 'RevPi AIO', 'Caja de control IP65'],
      datasheetUrl: '/docs/catalog/rtu/RTU-03.pdf'
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
      related: ['Gateway WirelessHART', 'Gateway Dragino MS48-LR', 'Milesight UG56', 'LT-22222-L LoRa I/O Controller'],
      datasheetUrl: '/docs/catalog/rtu/RTU-04.pdf'
    },
    {
      id: 'rtu-cx',
      category: 'rtu',
      code: 'CUSTOM',
      name: 'Serie CX',
      subtitle: 'RTU personalizada armable según requerimiento',
      image: 'catalog/rtu/rtu-cx-custom.png',
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
      related: ['RevPi Core S', 'RevPi Connect 5', 'Módulos I/O', 'Gateways industriales', 'Caja de control IP65'],
      datasheetUrl: '/docs/catalog/rtu/RTU-05.pdf'
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
    /* Producto de variadores pendiente de información técnica real.
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
    }, */
    {
      id: 'camera-dahua-dh-sd3d216nb-gny',
      category: 'cameras',
      code: 'DH-SD3D216NB-GNY',
      name: 'Cámara PTZ Dahua',
      subtitle: 'Sensor visual inteligente para SCADA y supervisión remota',
      image: 'catalog/cameras/dahua-dh-sd3d216nb-gny.svg',
      description: 'Cámara PTZ robusta para despliegues SCADA industriales y entornos remotos. Combina cobertura motorizada, inteligencia de borde, automatización por presets y trazabilidad centralizada, aportando contexto visual a los procesos sin exigir una infraestructura de red compleja.',
      highlights: ['Zoom óptico 16x', 'Hasta 300 presets', 'Starlight', 'IP66'],
      specs: [
        { label: 'Óptica y movimiento', value: 'PTZ, zoom óptico 16x y hasta 300 posiciones predefinidas' },
        { label: 'Video y red', value: 'Smart H.265+, RTSP y substream optimizado para enlaces satelitales' },
        { label: 'Inteligencia', value: 'Analítica WizSense integrada y automatización local basada en eventos' },
        { label: 'Integración', value: 'Dahua CGI sobre HTTP con autenticación Digest' },
        { label: 'Almacenamiento', value: 'Grabación local mediante tarjeta MicroSD' },
        { label: 'Protección ambiental', value: 'IP66 y amplio rango térmico para instalaciones exteriores' },
        { label: 'Protección eléctrica', value: 'TVS 6000 V contra sobretensiones y perturbaciones eléctricas' },
        { label: 'Alimentación', value: 'PoE industrial: energía y datos mediante el mismo cable' }
      ],
      applications: [
        'Automatización de alarmas con captura inmediata de evidencia visual.',
        'Supervisión de instalaciones y activos críticos en sitios remotos.',
        'Auditoría y trazabilidad visual integrada con controladores Edge y SCADA.'
      ],
      related: ['RevPi Connect 5', 'Starlink', 'SCADA', 'MicroSD'],
      datasheetUrl: '/docs/catalog/cameras/dahua-dh-sd3d216nb-gny.pdf'
    },
    {
      id: 'flow-mfe600-e',
      category: 'flow',
      code: 'MFE600-E',
      name: 'Caudalímetro electromagnético MFE600-E',
      subtitle: 'Medición de alta precisión para fluidos conductivos',
      image: 'catalog/flow/mfe600-e.png',
      description: 'Instrumento para cuantificar el flujo volumétrico de fluidos conductivos en tuberías cerradas. Su medición es independiente de la densidad, viscosidad, temperatura o presión del líquido y el tubo carece de piezas móviles, evitando obstrucciones y pérdida de carga.',
      highlights: ['DN10 a DN3000', 'Precisión hasta ±0.2%', 'HART / Modbus RTU', 'IP65 / IP68'],
      specs: [
        { label: 'Diámetro nominal', value: 'DN10 a DN3000' },
        { label: 'Precisión', value: '±0.5% del valor medido; ±0.2% opcional' },
        { label: 'Señales y protocolos', value: '4-20 mA, pulsos/frecuencia, RS485 Modbus RTU y HART' },
        { label: 'Revestimiento', value: 'PTFE, caucho de cloropreno, PFA, FEP o poliuretano' },
        { label: 'Electrodos', value: 'Acero inoxidable 316L, Hastelloy C/B, titanio, tántalo o platino' },
        { label: 'Protección', value: 'IP65 en versión compacta e IP68 con sensor remoto' },
        { label: 'Alimentación', value: '85-250 VAC o 20-36 VDC' }
      ],
      applications: ['Tratamiento y distribución de agua.', 'Industria química y alimentaria.', 'Procesos papeleros y metalúrgicos.'],
      datasheetUrl: '/docs/catalog/flow/catalogo-sensores-flujo.pdf'
    },
    {
      id: 'flow-mfe600z',
      category: 'flow',
      code: 'MFE600Z',
      name: 'Caudalímetro electromagnético MFE600Z',
      subtitle: 'Telemetría autónoma para redes de agua y sitios remotos',
      image: 'catalog/flow/mfe600z.png',
      description: 'Caudalímetro inteligente de ultra bajo consumo para redes de distribución de agua y localizaciones sin acceso a la red eléctrica. Integra alimentación por batería, autodiagnóstico y opciones de transmisión inalámbrica para sistemas de telemetría y SCADA.',
      highlights: ['Batería de 3 a 5 años', 'GPRS / NB-IoT / LoRa', 'IP68', 'Autodiagnóstico'],
      specs: [
        { label: 'Diámetro nominal', value: 'DN10 a DN800; ampliable a DN3000 bajo pedido' },
        { label: 'Precisión', value: '±0.5% del valor medido' },
        { label: 'Comunicación', value: 'Pulsos, RS485 y transmisión inalámbrica celular/IoT integrada' },
        { label: 'Alimentación', value: 'Baterías internas de litio de 3.6 V o fuente externa de 12-24 VDC' },
        { label: 'Cuerpo y bridas', value: 'Acero al carbono con epoxi o acero inoxidable' },
        { label: 'Presión máxima', value: '0.6 MPa a 4.0 MPa según diámetro nominal' },
        { label: 'Protección', value: 'IP68, totalmente sumergible' }
      ],
      applications: ['Redes de distribución de agua.', 'Estaciones de bombeo aisladas.', 'Pozos de registro y arquetas inundables.'],
      datasheetUrl: '/docs/catalog/flow/catalogo-sensores-flujo.pdf'
    },
    {
      id: 'flow-mfe600h',
      category: 'flow',
      code: 'MFE600H',
      name: 'Caudalímetro de calor MFE600H',
      subtitle: 'Medición simultánea de caudal y energía térmica',
      image: 'catalog/flow/mfe600h.png',
      description: 'Medidor electromagnético especializado para cuantificar el caudal y el consumo de calor o frío en circuitos cerrados de agua. Combina la medición de flujo con dos sensores de temperatura calibrados para calcular en tiempo real la energía térmica transferida.',
      highlights: ['DN15 a DN1200', 'PT1000 pareadas', 'M-Bus / Modbus RTU', '2 °C a 150 °C'],
      specs: [
        { label: 'Diámetro nominal', value: 'DN15 a DN1200' },
        { label: 'Sensores de temperatura', value: 'Par de termorresistencias PT1000 emparejadas de alta precisión' },
        { label: 'Precisión de caudal', value: '±0.5%' },
        { label: 'Unidades de energía', value: 'GJ, kWh, MWh o kcal seleccionables' },
        { label: 'Señales y protocolos', value: '4-20 mA, RS485 Modbus RTU y M-Bus' },
        { label: 'Temperatura del fluido', value: '2 °C a 150 °C' },
        { label: 'Protección y alimentación', value: 'IP65; alimentación dual 220 VAC / 24 VDC' }
      ],
      applications: ['Sistemas HVAC y gestión técnica de edificios.', 'Redes de calefacción urbana.', 'Circuitos de refrigeración industrial.'],
      datasheetUrl: '/docs/catalog/flow/catalogo-sensores-flujo.pdf'
    },
    {
      id: 'flow-mfe600c',
      category: 'flow',
      code: 'MFE600C',
      name: 'Caudalímetro de inserción MFE600C',
      subtitle: 'Medición económica para tuberías de gran diámetro',
      image: 'catalog/flow/mfe600c.png',
      description: 'Caudalímetro electromagnético de inserción para medir grandes conducciones sin instalar un equipo en línea completo. Su sistema hot-tap permite instalarlo, mantenerlo y retirarlo bajo presión mediante una válvula esférica, sin detener el proceso.',
      highlights: ['DN100 a DN3000', 'Instalación hot-tap', 'Cero paradas', 'Modbus RS485'],
      specs: [
        { label: 'Diámetro aplicable', value: 'DN100 a DN3000' },
        { label: 'Precisión', value: '±1.5% a ±2.5% de la escala completa' },
        { label: 'Velocidad de flujo', value: '0.5 m/s a 10 m/s' },
        { label: 'Señales', value: '4-20 mA, frecuencia/pulsos y RS485 Modbus' },
        { label: 'Sonda', value: 'Acero inoxidable 304 o 316L' },
        { label: 'Presión máxima', value: '1.6 MPa estándar' },
        { label: 'Protección y alimentación', value: 'Cabezal IP65, sensor IP68; 85-250 VAC o 24 VDC' }
      ],
      applications: ['Auditorías temporales y detección de fugas.', 'Redes de agua de gran diámetro.', 'Sistemas de irrigación a gran escala.'],
      datasheetUrl: '/docs/catalog/flow/catalogo-sensores-flujo.pdf'
    },
    {
      id: 'temperature-lg200-frf',
      category: 'temperature',
      code: 'LG200-FRF',
      name: 'Transmisor de temperatura LG200-FRF',
      subtitle: 'Diseño higiénico para procesos sanitarios CIP/SIP',
      image: 'catalog/temperature/lg200-frf.png',
      description: 'Transmisor integrado de diseño higiénico con electrónica ASIC/SMT y construcción en acero inoxidable. Está orientado a mediciones precisas en industrias alimentarias y farmacéuticas, soportando procesos de limpieza y esterilización in situ.',
      highlights: ['-50 a 400 °C', '4-20 mA', 'Acero 316L', 'Certificación 3-A'],
      specs: [
        { label: 'Rango', value: '-50 a 400 °C' },
        { label: 'Salida', value: '4-20 mA' },
        { label: 'Precisión', value: '±0.5% URL' },
        { label: 'Estabilidad', value: 'Superior a ±0.05% URL o 0.1 °C/año' },
        { label: 'Conexión eléctrica', value: 'Terminal inoxidable o conector M12×1 de 4 pines, IP67' },
        { label: 'Sonda', value: 'Diámetros de 6 a 14 mm y longitudes de 50 a 3000 mm' },
        { label: 'Conexión de proceso', value: 'M20×1.5, G1/2, 1/2-14NPT, Tri-Clamp 1-1/2 o 2 pulgadas y brida' },
        { label: 'Certificaciones', value: '3-A y CE' }
      ],
      applications: ['Procesamiento de alimentos y bebidas.', 'Industria farmacéutica.', 'Procesos sanitarios con limpieza CIP/SIP.'],
      datasheetUrl: '/docs/catalog/temperature/catalogo-sensores-temperatura.pdf'
    },
    {
      id: 'temperature-lg200-drdh',
      category: 'temperature',
      code: 'LG200-DRD(H)',
      name: 'Transmisor de temperatura LG200-DRD(H)',
      subtitle: 'Respuesta rápida y configuración flexible para la industria',
      image: 'catalog/temperature/lg200-drdh.png',
      description: 'Transmisor integrado flexible y confiable para medición térmica industrial. Incorpora electrónica ASIC/SMT, respuesta rápida y protección de grado 4 frente a sobretensiones transitorias severas.',
      highlights: ['≤ 200 ms', '-50 a 400 °C', '4-20 mA / 1-5 VDC', 'Protección grado 4'],
      specs: [
        { label: 'Rango', value: '-50 a 400 °C' },
        { label: 'Salida', value: '4-20 mA, 1-5 VDC o señal directa del sensor' },
        { label: 'Precisión', value: '±0.5% URL' },
        { label: 'Tiempo de respuesta', value: '≤ 200 ms' },
        { label: 'Estabilidad', value: 'Superior a ±0.05% URL o 0.1 °C/año' },
        { label: 'Conexión eléctrica', value: 'DIN43650 IP65 o M12×1 de 4 pines IP67' },
        { label: 'Sonda', value: 'Diámetros de 6 a 14 mm y longitudes de 50 a 3000 mm' },
        { label: 'Certificación', value: 'CE' }
      ],
      applications: ['Medición térmica industrial general.', 'Procesos con cambios rápidos de temperatura.', 'Instalaciones expuestas a variaciones severas de tensión.'],
      datasheetUrl: '/docs/catalog/temperature/catalogo-sensores-temperatura.pdf'
    },
    {
      id: 'temperature-lg200-wrt',
      category: 'temperature',
      code: 'LG200-WRT',
      name: 'Transmisor de temperatura LG200-WRT',
      subtitle: 'Medición robusta para atmósferas explosivas',
      image: 'catalog/temperature/lg200-wrt.png',
      description: 'Transmisor industrial para mediciones térmicas en condiciones críticas. Su carcasa de aleación de aluminio, electrónica ASIC/SMT y certificación a prueba de explosiones lo hacen apto para entornos exigentes y áreas clasificadas.',
      highlights: ['Ex-proof', 'HART', '≤ 200 ms', '-50 a 400 °C'],
      specs: [
        { label: 'Rango', value: '-50 a 400 °C' },
        { label: 'Salida', value: '4-20 mA o 4-20 mA con protocolo HART' },
        { label: 'Precisión', value: '±0.5% URL' },
        { label: 'Tiempo de respuesta', value: '≤ 200 ms' },
        { label: 'Estabilidad', value: 'Superior a ±0.05% URL o 0.1 °C/año' },
        { label: 'Conexión eléctrica', value: 'Terminal de aluminio con dos entradas M20×1.5' },
        { label: 'Sonda', value: 'Diámetros de 6 a 14 mm y longitudes de 50 a 3000 mm' },
        { label: 'Certificaciones', value: 'CE y Ex-proof' }
      ],
      applications: ['Petróleo y gas.', 'Áreas industriales clasificadas.', 'Procesos críticos con riesgo de atmósferas explosivas.'],
      datasheetUrl: '/docs/catalog/temperature/catalogo-sensores-temperatura.pdf'
    },
    {
      id: 'pressure-smp858-nsf',
      category: 'pressure',
      code: 'SMP858-NSF',
      name: 'Transmisor de presión diferencial SMP858-NSF',
      subtitle: 'Medición higiénica diferencial con máxima resistencia a sobrecargas',
      image: 'catalog/pressure/smp858-nsf.png',
      description: 'Transmisor de presión diferencial de monosilicio diseñado para procesos higiénicos. Su estructura de aislamiento totalmente sellada reduce los efectos de la humedad, mientras la protección de doble diafragma permite operar en aplicaciones sanitarias con limpieza húmeda intensa y sobrecargas severas.',
      highlights: ['4 kPa a 1 MPa', 'Sobrecarga hasta 24 MPa', '4-20 mA + HART', 'FDA / GMP'],
      specs: [
        { label: 'Tipo de presión', value: 'Presión diferencial' },
        { label: 'Rango de medición', value: '4 kPa a 1 MPa' },
        { label: 'Señal de salida', value: '4-20 mA o 4-20 mA + HART' },
        { label: 'Precisión de referencia', value: '±0.1% URL, ±0.2% URL o ±0.5% URL' },
        { label: 'Sobrecarga máxima', value: 'Hasta 24 MPa' },
        { label: 'Construcción', value: 'Estructura totalmente soldada y aislamiento completo contra humedad' },
        { label: 'Cumplimiento', value: 'FDA, GMP y estándares de higiene' }
      ],
      applications: [
        'Medición diferencial en procesos alimentarios y farmacéuticos.',
        'Instalaciones con limpieza húmeda intensa y requisitos sanitarios.',
        'Procesos expuestos a picos y sobrecargas elevadas de presión.'
      ],
      datasheetUrl: '/docs/catalog/pressure/catalogo-sensores-presion.pdf'
    },
    {
      id: 'pressure-smp858-tlf',
      category: 'pressure',
      code: 'SMP858-TLF',
      name: 'Transmisor de presión manométrica SMP858-TLF',
      subtitle: 'Diseño sanitario compacto para limpieza y esterilización CIP/SIP',
      image: 'catalog/pressure/smp858-tlf.png',
      description: 'Transmisor de presión manométrica higiénico para las industrias alimentaria y farmacéutica. Integra piezas húmedas de acero inoxidable 316L con soldadura integral, acabado sanitario, protección de doble diafragma y fluido de llenado certificado por la FDA.',
      highlights: ['10 kPa a 2 MPa', 'Acero 316L', 'Ra ≤ 0.4 μm', 'CIP / SIP'],
      specs: [
        { label: 'Tipo de presión', value: 'Presión manométrica' },
        { label: 'Rango de medición', value: '10 kPa a 2 MPa' },
        { label: 'Señal de salida', value: '4-20 mA o 4-20 mA + HART' },
        { label: 'Precisión de referencia', value: '±0.2% URL o ±0.5% URL' },
        { label: 'Material y rugosidad', value: 'Acero inoxidable 316L, Ra ≤ 0.4 μm' },
        { label: 'Conexiones de proceso', value: 'Tri-Clamp 1-1/2, Tri-Clamp 2, DIN32676 DN32, ISO2852 y DRD' },
        { label: 'Certificaciones', value: '3-A, EHEDG, CE, RoHS y certificado a prueba de explosiones' }
      ],
      applications: [
        'Procesamiento de alimentos y bebidas con limpieza CIP/SIP.',
        'Producción farmacéutica y procesos estériles.',
        'Medición sanitaria en tanques y líneas de proceso.'
      ],
      datasheetUrl: '/docs/catalog/pressure/catalogo-sensores-presion.pdf'
    },
    {
      id: 'pressure-smp858-tsf-s',
      category: 'pressure',
      code: 'SMP858-TSF-S',
      name: 'Transmisor de presión manométrica SMP858-TSF-S',
      subtitle: 'Medición sanitaria de rango ampliado para procesos exigentes',
      image: 'catalog/pressure/smp858-tsf-s.png',
      description: 'Transmisor manométrico higiénico con construcción compacta, piezas húmedas de acero inoxidable 316L, soldadura integral y acabado de alta calidad. Está preparado para limpieza CIP/SIP, evita la condensación interna y ofrece configuración local mediante electrónica ASIC/SMT.',
      highlights: ['10 kPa a 3 MPa', '4-20 mA + HART', 'Ra ≤ 0.4 μm', '3-A / EHEDG'],
      specs: [
        { label: 'Tipo de presión', value: 'Presión manométrica' },
        { label: 'Rango de medición', value: '10 kPa a 3 MPa' },
        { label: 'Señal de salida', value: '4-20 mA o 4-20 mA + HART' },
        { label: 'Precisión de referencia', value: '±0.2% URL o ±0.5% URL' },
        { label: 'Material y rugosidad', value: 'Acero inoxidable 316L, Ra ≤ 0.4 μm' },
        { label: 'Conexiones de proceso', value: 'Tri-Clamp 1-1/2, Tri-Clamp 2, DIN32676 DN32, ISO2852 y DRD' },
        { label: 'Certificaciones', value: '3-A, EHEDG, CE, RoHS y certificado a prueba de explosiones' }
      ],
      applications: [
        'Procesos sanitarios con presiones de hasta 3 MPa.',
        'Industria alimentaria y farmacéutica.',
        'Líneas sometidas a limpieza y esterilización CIP/SIP.'
      ],
      datasheetUrl: '/docs/catalog/pressure/catalogo-sensores-presion.pdf'
    }
  ];

  get filteredProducts() {
    const search = this.normalizeSearch(this.searchTerm);

    return this.products.filter(product => {
      const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      const matchesSearch = !search || this.productMatchesSearch(product, search);
      return matchesCategory && matchesSearch;
    });
  }

  get activeCategoryLabel() {
    const category = this.categories.find(item => item.id === this.selectedCategory);
    return category ? this.t(category.labelKey) : '';
  }

  getCategoryLabelKey(category: CatalogCategory) {
    const labels: Record<CatalogCategory, string> = {
      rtu: 'CATALOG.CATEGORIES.RTU',
      accessories: 'CATALOG.CATEGORIES.ACCESSORIES',
      drives: 'CATALOG.CATEGORIES.DRIVES',
      cameras: 'CATALOG.CATEGORIES.CAMERAS',
      flow: 'CATALOG.CATEGORIES.FLOW',
      temperature: 'CATALOG.CATEGORIES.TEMPERATURE',
      pressure: 'CATALOG.CATEGORIES.PRESSURE'
    };

    return labels[category];
  }

  selectCategory(category: CatalogCategory | 'all') {
    this.selectedCategory = category;
    this.closeDetails();
  }

  applySearch() {
    this.closeDetails();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'rtu';
    this.closeDetails();
  }

  openDetails(product: CatalogProduct) {
    this.resetProductImageZoom();
    this.selectedProduct = product;
    this.lockBodyScroll();
  }

  closeDetails() {
    this.resetProductImageZoom();
    this.selectedProduct = null;
    this.unlockBodyScroll();
  }

  onProductImagePointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && !this.isProductImageZoomed) {
      return;
    }

    if (event.pointerType === 'touch') {
      event.preventDefault();
    }

    this.updateProductImageLens(event.currentTarget as HTMLElement, event.clientX, event.clientY);
    this.isProductImageZoomed = true;
  }

  onProductImagePointerLeave(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      this.resetProductImageZoom();
    }
  }

  onProductImagePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return;
    }

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateProductImageLens(event.currentTarget as HTMLElement, event.clientX, event.clientY);
    this.isProductImageZoomed = true;
  }

  onProductImagePointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      this.resetProductImageZoom();
    }
  }

  toggleProductImageZoom(event: Event) {
    if (this.isProductImageZoomed) {
      this.resetProductImageZoom();
      return;
    }

    const container = event.currentTarget as HTMLElement;
    const bounds = container.getBoundingClientRect();
    this.updateProductImageLens(container, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    this.isProductImageZoomed = true;
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

  private updateProductImageLens(container: HTMLElement, clientX: number, clientY: number) {
    const containerBounds = container.getBoundingClientRect();
    const image = container.querySelector<HTMLImageElement>('.catalog-modal-visual__image');

    if (!image?.naturalWidth || !image.naturalHeight) {
      return;
    }

    const radius = Math.min(this.productImageLensRadius, containerBounds.width / 2, containerBounds.height / 2);
    const localX = clientX - containerBounds.left;
    const localY = clientY - containerBounds.top;
    this.productImageLensLeft = Math.min(containerBounds.width - radius, Math.max(radius, localX));
    this.productImageLensTop = Math.min(containerBounds.height - radius, Math.max(radius, localY));

    const imageBounds = image.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = imageBounds.width / imageBounds.height;
    let renderedWidth = imageBounds.width;
    let renderedHeight = imageBounds.height;
    let renderedLeft = imageBounds.left;
    let renderedTop = imageBounds.top;

    if (boxRatio > naturalRatio) {
      renderedWidth = renderedHeight * naturalRatio;
      renderedLeft += (imageBounds.width - renderedWidth) / 2;
    } else {
      renderedHeight = renderedWidth / naturalRatio;
      renderedTop += (imageBounds.height - renderedHeight) / 2;
    }

    const focusX = Math.min(renderedWidth, Math.max(0, clientX - renderedLeft));
    const focusY = Math.min(renderedHeight, Math.max(0, clientY - renderedTop));
    this.productImageLensImageWidth = renderedWidth * this.productImageLensZoom;
    this.productImageLensImageHeight = renderedHeight * this.productImageLensZoom;
    this.productImageLensImageLeft = radius - focusX * this.productImageLensZoom;
    this.productImageLensImageTop = radius - focusY * this.productImageLensZoom;
  }

  private resetProductImageZoom() {
    this.isProductImageZoomed = false;
  }

  private productMatchesSearch(product: CatalogProduct, search: string) {
    const primaryTokens = this.getSearchTokens([
      product.code,
      product.name,
      product.subtitle,
      product.description,
      this.t(this.getCategoryLabelKey(product.category)),
      ...product.highlights
    ]);

    if (primaryTokens.some(token => token.startsWith(search))) {
      return true;
    }

    if (search.length < 3) {
      return false;
    }

    const secondaryTokens = this.getSearchTokens([
      ...product.applications,
      ...(product.related ?? []),
      ...product.specs.flatMap(spec => [spec.label, spec.value])
    ]);

    return secondaryTokens.some(token => token.startsWith(search));
  }

  private lockBodyScroll() {
    if (this.isBodyScrollLocked || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    this.lockedScrollY = window.scrollY;
    this.previousDocumentOverflow = document.documentElement.style.overflow;
    this.previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    this.isBodyScrollLocked = true;
  }

  private unlockBodyScroll() {
    if (!this.isBodyScrollLocked || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyStyles.overflow;
    document.body.style.position = this.previousBodyStyles.position;
    document.body.style.top = this.previousBodyStyles.top;
    document.body.style.left = this.previousBodyStyles.left;
    document.body.style.right = this.previousBodyStyles.right;
    document.body.style.width = this.previousBodyStyles.width;
    window.scrollTo(0, this.lockedScrollY);

    this.previousDocumentOverflow = '';
    this.lockedScrollY = 0;
    this.isBodyScrollLocked = false;
  }

  private getSearchTokens(values: string[]) {
    return values
      .join(' ')
      .split(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/)
      .map(value => this.normalizeSearch(value))
      .filter(Boolean);
  }

  private normalizeSearch(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private t(key: string) {
    const value = this.translate.instant(key);
    return typeof value === 'string' ? value : key;
  }

  private async initPumpjackScene() {
    const canvas = this.pumpjackCanvas?.nativeElement;
    const container = canvas?.parentElement;

    if (!canvas || !container) {
      return;
    }

    const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js')
    ]);

    this.three = THREE;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(4.4, 2.1, 5.2);

    let renderer: ThreeNamespace.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
    } catch (error) {
      container.classList.add('catalog-hero-model--webgl-unavailable');
      console.warn('No se pudo iniciar WebGL para el modelo pumpjack.glb', error);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const controls = new OrbitControls(camera, canvas);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.65;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.8;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;

    scene.add(new THREE.HemisphereLight(0xf4ffe0, 0x122014, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbef264, 2.4);
    rimLight.position.set(-4, 2.5, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x86efac, 18, 8);
    fillLight.position.set(0, 1.6, 3.5);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    loader.load(
      this.pumpjackModelUrl,
      gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              material.side = THREE.DoubleSide;
              material.needsUpdate = true;

              if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
                material.metalness = Math.min(material.metalness, 0.45);
                material.roughness = Math.max(material.roughness, 0.38);
              }
            });
          }
        });

        scene.add(model);
        this.framePumpjackModel(model, camera, controls);
      },
      undefined,
      error => {
        console.warn('No se pudo cargar el modelo pumpjack.glb', error);
      }
    );

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    this.pumpjackResizeObserver = new ResizeObserver(resize);
    this.pumpjackResizeObserver.observe(container);

    const animate = () => {
      this.pumpjackAnimationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    this.pumpjackScene = scene;
    this.pumpjackCamera = camera;
    this.pumpjackRenderer = renderer;
    this.pumpjackControls = controls;
  }

  private framePumpjackModel(
    model: ThreeNamespace.Object3D,
    camera: ThreeNamespace.PerspectiveCamera,
    controls: OrbitControlsType
  ) {
    const THREE = this.three;

    if (!THREE) {
      return;
    }

    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxInitialDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);

    if (maxInitialDimension > 0) {
      model.scale.setScalar(3.6 / maxInitialDimension);
    }

    const fittedBox = new THREE.Box3().setFromObject(model);
    const center = fittedBox.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const groundedBox = new THREE.Box3().setFromObject(model);
    model.position.y -= groundedBox.min.y;
    model.rotation.y = -Math.PI * 0.18;

    const finalBox = new THREE.Box3().setFromObject(model);
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const radius = Math.max(finalSize.x, finalSize.y, finalSize.z) * 0.58;

    controls.target.copy(finalCenter);
    controls.target.y += finalSize.y * 0.12;
    controls.minDistance = Math.max(radius * 1.2, 2.6);
    controls.maxDistance = Math.max(radius * 2.9, 6.5);
    camera.position.set(
      finalCenter.x + radius * 1.35,
      finalCenter.y + radius * 0.72,
      finalCenter.z + radius * 1.55
    );
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
  }

  private destroyPumpjackScene() {
    const THREE = this.three;

    if (this.pumpjackAnimationFrame) {
      window.cancelAnimationFrame(this.pumpjackAnimationFrame);
    }

    this.pumpjackResizeObserver?.disconnect();
    this.pumpjackControls?.dispose();
    this.pumpjackRenderer?.dispose();

    this.pumpjackScene?.traverse(object => {
      if (THREE && object instanceof THREE.Mesh) {
        object.geometry?.dispose();

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}
