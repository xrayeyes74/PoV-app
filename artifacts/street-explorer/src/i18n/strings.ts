export const LANGUAGES = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

export type LangCode = typeof LANGUAGES[number]["code"];

export type Strings = {
  landing: {
    tagline: string;
    cta_signup: string;
    cta_login: string;
    feature_streetview_title: string;
    feature_streetview_desc: string;
    feature_camera_title: string;
    feature_camera_desc: string;
    feature_compass_title: string;
    feature_compass_desc: string;
    feature_ai_title: string;
    feature_ai_desc: string;
  };
  explorer: {
    search_placeholder: string;
    go: string;
    analyze: string;
    analyzing: string;
    use_my_location: string;
    cancel_destination: string;
    show_poi: string;
    filter_poi: string;
    open_camera: string;
    destination: string;
    no_name: string;
    loading_maps: string;
    destination_not_found: string;
    try_specific_address: string;
    geolocation_not_supported: string;
    location_access_denied: string;
    please_allow_location: string;
    analysis_failed: string;
    analysis_error: string;
    maps_error_title: string;
    maps_error_tech: string;
  };
  poi: {
    restaurant: string;
    bar: string;
    cafe: string;
    bakery: string;
    supermarket: string;
    store: string;
    shopping_mall: string;
    clothing: string;
    hotel: string;
    museum: string;
    art_gallery: string;
    tourist_attraction: string;
    church: string;
    place_of_worship: string;
    school: string;
    university: string;
    hospital: string;
    doctor: string;
    pharmacy: string;
    gym: string;
    park: string;
    bank: string;
    atm: string;
    gas_station: string;
    parking: string;
    subway: string;
    bus_stop: string;
    train_station: string;
    food: string;
    transport: string;
    point_of_interest: string;
  };
  common: { ok: string; account: string; sign_out: string };
};

const it: Strings = {
  landing: {
    tagline: "Esplora il mondo con Street View, fotocamera AR e analisi AI dei luoghi intorno a te.",
    cta_signup: "Inizia gratuitamente",
    cta_login: "Accedi",
    feature_streetview_title: "Street View & Mappa",
    feature_streetview_desc: "Naviga ovunque con Street View interattivo e mappa POI in tempo reale.",
    feature_camera_title: "Fotocamera AR",
    feature_camera_desc: "Punta il telefono e vedi i punti di interesse sovrapposti alla realtà.",
    feature_compass_title: "Navigazione bussola",
    feature_compass_desc: "Freccia direzionale verso la tua destinazione, distanza inclusa.",
    feature_ai_title: "Analisi AI",
    feature_ai_desc: "Descrizione intelligente dell'ambiente: architettura, negozi, atmosfera.",
  },
  explorer: {
    search_placeholder: "Cerca indirizzo o città...",
    go: "Vai",
    analyze: "Analizza",
    analyzing: "Analisi...",
    use_my_location: "Usa la mia posizione",
    cancel_destination: "Cancella destinazione",
    show_poi: "Mostra POI",
    filter_poi: "Filtra POI",
    open_camera: "Apri fotocamera",
    destination: "Destinazione",
    no_name: "Senza nome",
    loading_maps: "Caricamento Google Maps...",
    destination_not_found: "Destinazione non trovata",
    try_specific_address: "Prova con un indirizzo più specifico.",
    geolocation_not_supported: "Geolocalizzazione non supportata",
    location_access_denied: "Accesso alla posizione negato",
    please_allow_location: "Consenti l'accesso alla posizione per usare questa funzione.",
    analysis_failed: "Analisi fallita",
    analysis_error: "Impossibile analizzare questa posizione. Prova a spostarti leggermente.",
    maps_error_title: "Errore Google Maps",
    maps_error_tech: "Errore tecnico:",
  },
  poi: {
    restaurant: "Ristorante", bar: "Bar", cafe: "Caffè", bakery: "Panetteria",
    supermarket: "Supermercato", store: "Negozio", shopping_mall: "Centro commerciale",
    clothing: "Abbigliamento", hotel: "Hotel", museum: "Museo", art_gallery: "Galleria d'arte",
    tourist_attraction: "Attrazione turistica", church: "Chiesa", place_of_worship: "Luogo di culto",
    school: "Scuola", university: "Università", hospital: "Ospedale", doctor: "Medico",
    pharmacy: "Farmacia", gym: "Palestra", park: "Parco", bank: "Banca", atm: "Bancomat",
    gas_station: "Distributore", parking: "Parcheggio", subway: "Metropolitana",
    bus_stop: "Fermata autobus", train_station: "Stazione", food: "Cibo",
    transport: "Trasporti", point_of_interest: "Punto d'interesse",
  },
  common: { ok: "OK", account: "Account", sign_out: "Esci" },
};

const en: Strings = {
  landing: {
    tagline: "Explore the world with Street View, AR camera and AI analysis of places around you.",
    cta_signup: "Get started for free",
    cta_login: "Sign in",
    feature_streetview_title: "Street View & Map",
    feature_streetview_desc: "Navigate anywhere with interactive Street View and real-time POI map.",
    feature_camera_title: "AR Camera",
    feature_camera_desc: "Point your phone and see points of interest overlaid on reality.",
    feature_compass_title: "Compass Navigation",
    feature_compass_desc: "Directional arrow toward your destination, distance included.",
    feature_ai_title: "AI Analysis",
    feature_ai_desc: "Smart description of the environment: architecture, shops, atmosphere.",
  },
  explorer: {
    search_placeholder: "Search address or city...",
    go: "Go",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    use_my_location: "Use my location",
    cancel_destination: "Cancel destination",
    show_poi: "Show POI",
    filter_poi: "Filter POI",
    open_camera: "Open camera",
    destination: "Destination",
    no_name: "No name",
    loading_maps: "Loading Google Maps...",
    destination_not_found: "Destination not found",
    try_specific_address: "Try a more specific address.",
    geolocation_not_supported: "Geolocation not supported",
    location_access_denied: "Location access denied",
    please_allow_location: "Please allow location access to use this feature.",
    analysis_failed: "Analysis failed",
    analysis_error: "Could not analyze this location. Try moving slightly.",
    maps_error_title: "Google Maps Error",
    maps_error_tech: "Technical error:",
  },
  poi: {
    restaurant: "Restaurant", bar: "Bar", cafe: "Café", bakery: "Bakery",
    supermarket: "Supermarket", store: "Store", shopping_mall: "Shopping mall",
    clothing: "Clothing", hotel: "Hotel", museum: "Museum", art_gallery: "Art gallery",
    tourist_attraction: "Tourist attraction", church: "Church", place_of_worship: "Place of worship",
    school: "School", university: "University", hospital: "Hospital", doctor: "Doctor",
    pharmacy: "Pharmacy", gym: "Gym", park: "Park", bank: "Bank", atm: "ATM",
    gas_station: "Gas station", parking: "Parking", subway: "Subway",
    bus_stop: "Bus stop", train_station: "Train station", food: "Food",
    transport: "Transport", point_of_interest: "Point of interest",
  },
  common: { ok: "OK", account: "Account", sign_out: "Sign out" },
};

const fr: Strings = {
  landing: {
    tagline: "Explorez le monde avec Street View, caméra AR et analyse AI des lieux autour de vous.",
    cta_signup: "Commencer gratuitement",
    cta_login: "Se connecter",
    feature_streetview_title: "Street View & Carte",
    feature_streetview_desc: "Naviguez partout avec Street View interactif et carte POI en temps réel.",
    feature_camera_title: "Caméra AR",
    feature_camera_desc: "Pointez votre téléphone et voyez les points d'intérêt superposés à la réalité.",
    feature_compass_title: "Navigation boussole",
    feature_compass_desc: "Flèche directionnelle vers votre destination, distance incluse.",
    feature_ai_title: "Analyse IA",
    feature_ai_desc: "Description intelligente de l'environnement : architecture, commerces, ambiance.",
  },
  explorer: {
    search_placeholder: "Rechercher une adresse ou une ville...",
    go: "Aller",
    analyze: "Analyser",
    analyzing: "Analyse...",
    use_my_location: "Utiliser ma position",
    cancel_destination: "Annuler la destination",
    show_poi: "Afficher POI",
    filter_poi: "Filtrer POI",
    open_camera: "Ouvrir la caméra",
    destination: "Destination",
    no_name: "Sans nom",
    loading_maps: "Chargement de Google Maps...",
    destination_not_found: "Destination introuvable",
    try_specific_address: "Essayez une adresse plus précise.",
    geolocation_not_supported: "Géolocalisation non prise en charge",
    location_access_denied: "Accès à la localisation refusé",
    please_allow_location: "Veuillez autoriser l'accès à la localisation pour utiliser cette fonction.",
    analysis_failed: "Analyse échouée",
    analysis_error: "Impossible d'analyser cet emplacement. Essayez de vous déplacer légèrement.",
    maps_error_title: "Erreur Google Maps",
    maps_error_tech: "Erreur technique :",
  },
  poi: {
    restaurant: "Restaurant", bar: "Bar", cafe: "Café", bakery: "Boulangerie",
    supermarket: "Supermarché", store: "Magasin", shopping_mall: "Centre commercial",
    clothing: "Vêtements", hotel: "Hôtel", museum: "Musée", art_gallery: "Galerie d'art",
    tourist_attraction: "Attraction touristique", church: "Église", place_of_worship: "Lieu de culte",
    school: "École", university: "Université", hospital: "Hôpital", doctor: "Médecin",
    pharmacy: "Pharmacie", gym: "Salle de sport", park: "Parc", bank: "Banque", atm: "Distributeur",
    gas_station: "Station-service", parking: "Parking", subway: "Métro",
    bus_stop: "Arrêt de bus", train_station: "Gare", food: "Alimentation",
    transport: "Transports", point_of_interest: "Point d'intérêt",
  },
  common: { ok: "OK", account: "Compte", sign_out: "Se déconnecter" },
};

const es: Strings = {
  landing: {
    tagline: "Explora el mundo con Street View, cámara AR y análisis AI de los lugares a tu alrededor.",
    cta_signup: "Comenzar gratis",
    cta_login: "Iniciar sesión",
    feature_streetview_title: "Street View & Mapa",
    feature_streetview_desc: "Navega a cualquier lugar con Street View interactivo y mapa POI en tiempo real.",
    feature_camera_title: "Cámara AR",
    feature_camera_desc: "Apunta tu teléfono y ve los puntos de interés superpuestos a la realidad.",
    feature_compass_title: "Navegación por brújula",
    feature_compass_desc: "Flecha direccional hacia tu destino, distancia incluida.",
    feature_ai_title: "Análisis IA",
    feature_ai_desc: "Descripción inteligente del entorno: arquitectura, tiendas, atmósfera.",
  },
  explorer: {
    search_placeholder: "Buscar dirección o ciudad...",
    go: "Ir",
    analyze: "Analizar",
    analyzing: "Analizando...",
    use_my_location: "Usar mi ubicación",
    cancel_destination: "Cancelar destino",
    show_poi: "Mostrar POI",
    filter_poi: "Filtrar POI",
    open_camera: "Abrir cámara",
    destination: "Destino",
    no_name: "Sin nombre",
    loading_maps: "Cargando Google Maps...",
    destination_not_found: "Destino no encontrado",
    try_specific_address: "Prueba con una dirección más específica.",
    geolocation_not_supported: "Geolocalización no compatible",
    location_access_denied: "Acceso a ubicación denegado",
    please_allow_location: "Permite el acceso a la ubicación para usar esta función.",
    analysis_failed: "Análisis fallido",
    analysis_error: "No se pudo analizar esta ubicación. Intenta moverte un poco.",
    maps_error_title: "Error de Google Maps",
    maps_error_tech: "Error técnico:",
  },
  poi: {
    restaurant: "Restaurante", bar: "Bar", cafe: "Café", bakery: "Panadería",
    supermarket: "Supermercado", store: "Tienda", shopping_mall: "Centro comercial",
    clothing: "Ropa", hotel: "Hotel", museum: "Museo", art_gallery: "Galería de arte",
    tourist_attraction: "Atracción turística", church: "Iglesia", place_of_worship: "Lugar de culto",
    school: "Escuela", university: "Universidad", hospital: "Hospital", doctor: "Médico",
    pharmacy: "Farmacia", gym: "Gimnasio", park: "Parque", bank: "Banco", atm: "Cajero automático",
    gas_station: "Gasolinera", parking: "Aparcamiento", subway: "Metro",
    bus_stop: "Parada de autobús", train_station: "Estación de tren", food: "Comida",
    transport: "Transporte", point_of_interest: "Punto de interés",
  },
  common: { ok: "OK", account: "Cuenta", sign_out: "Cerrar sesión" },
};

const ar: Strings = {
  landing: {
    tagline: "استكشف العالم مع Street View وكاميرا AR وتحليل AI للأماكن من حولك.",
    cta_signup: "ابدأ مجاناً",
    cta_login: "تسجيل الدخول",
    feature_streetview_title: "Street View والخريطة",
    feature_streetview_desc: "تنقل في أي مكان مع Street View التفاعلي وخريطة POI في الوقت الفعلي.",
    feature_camera_title: "كاميرا AR",
    feature_camera_desc: "وجّه هاتفك وشاهد نقاط الاهتمام متراكبة على الواقع.",
    feature_compass_title: "ملاحة البوصلة",
    feature_compass_desc: "سهم اتجاهي نحو وجهتك مع المسافة.",
    feature_ai_title: "تحليل الذكاء الاصطناعي",
    feature_ai_desc: "وصف ذكي للبيئة: الهندسة المعمارية، المحلات، الأجواء.",
  },
  explorer: {
    search_placeholder: "ابحث عن عنوان أو مدينة...",
    go: "اذهب",
    analyze: "تحليل",
    analyzing: "جارٍ التحليل...",
    use_my_location: "استخدم موقعي",
    cancel_destination: "إلغاء الوجهة",
    show_poi: "إظهار POI",
    filter_poi: "تصفية POI",
    open_camera: "فتح الكاميرا",
    destination: "الوجهة",
    no_name: "بدون اسم",
    loading_maps: "جارٍ تحميل خرائط Google...",
    destination_not_found: "الوجهة غير موجودة",
    try_specific_address: "جرّب عنواناً أكثر تحديداً.",
    geolocation_not_supported: "تحديد الموقع غير مدعوم",
    location_access_denied: "تم رفض الوصول إلى الموقع",
    please_allow_location: "يرجى السماح بالوصول إلى الموقع لاستخدام هذه الميزة.",
    analysis_failed: "فشل التحليل",
    analysis_error: "تعذر تحليل هذا الموقع. حاول التحرك قليلاً.",
    maps_error_title: "خطأ في خرائط Google",
    maps_error_tech: "خطأ تقني:",
  },
  poi: {
    restaurant: "مطعم", bar: "بار", cafe: "مقهى", bakery: "مخبز",
    supermarket: "سوبرماركت", store: "متجر", shopping_mall: "مركز تسوق",
    clothing: "ملابس", hotel: "فندق", museum: "متحف", art_gallery: "معرض فني",
    tourist_attraction: "معلم سياحي", church: "كنيسة", place_of_worship: "دار عبادة",
    school: "مدرسة", university: "جامعة", hospital: "مستشفى", doctor: "طبيب",
    pharmacy: "صيدلية", gym: "صالة رياضية", park: "حديقة", bank: "بنك", atm: "صراف آلي",
    gas_station: "محطة وقود", parking: "موقف سيارات", subway: "مترو",
    bus_stop: "موقف حافلة", train_station: "محطة قطار", food: "طعام",
    transport: "مواصلات", point_of_interest: "نقطة اهتمام",
  },
  common: { ok: "حسناً", account: "الحساب", sign_out: "تسجيل الخروج" },
};

const zh: Strings = {
  landing: {
    tagline: "通过街景、AR相机和AI分析探索您周围的世界。",
    cta_signup: "免费开始",
    cta_login: "登录",
    feature_streetview_title: "街景与地图",
    feature_streetview_desc: "使用交互式街景和实时POI地图导航到任何地方。",
    feature_camera_title: "AR相机",
    feature_camera_desc: "将手机对准，看到兴趣点叠加在现实上。",
    feature_compass_title: "指南针导航",
    feature_compass_desc: "指向目的地的方向箭头，包含距离。",
    feature_ai_title: "AI分析",
    feature_ai_desc: "智能描述环境：建筑、商店、氛围。",
  },
  explorer: {
    search_placeholder: "搜索地址或城市...",
    go: "前往",
    analyze: "分析",
    analyzing: "分析中...",
    use_my_location: "使用我的位置",
    cancel_destination: "取消目的地",
    show_poi: "显示POI",
    filter_poi: "筛选POI",
    open_camera: "打开相机",
    destination: "目的地",
    no_name: "无名称",
    loading_maps: "正在加载Google地图...",
    destination_not_found: "未找到目的地",
    try_specific_address: "请尝试更具体的地址。",
    geolocation_not_supported: "不支持地理定位",
    location_access_denied: "位置访问被拒绝",
    please_allow_location: "请允许访问位置以使用此功能。",
    analysis_failed: "分析失败",
    analysis_error: "无法分析此位置。请尝试稍微移动一下。",
    maps_error_title: "Google地图错误",
    maps_error_tech: "技术错误：",
  },
  poi: {
    restaurant: "餐厅", bar: "酒吧", cafe: "咖啡馆", bakery: "面包店",
    supermarket: "超市", store: "商店", shopping_mall: "购物中心",
    clothing: "服装", hotel: "酒店", museum: "博物馆", art_gallery: "画廊",
    tourist_attraction: "旅游景点", church: "教堂", place_of_worship: "礼拜场所",
    school: "学校", university: "大学", hospital: "医院", doctor: "医生",
    pharmacy: "药店", gym: "健身房", park: "公园", bank: "银行", atm: "ATM",
    gas_station: "加油站", parking: "停车场", subway: "地铁",
    bus_stop: "公交车站", train_station: "火车站", food: "食物",
    transport: "交通", point_of_interest: "兴趣点",
  },
  common: { ok: "好", account: "账户", sign_out: "退出登录" },
};

export const TRANSLATIONS: Record<LangCode, Strings> = { it, en, fr, es, ar, zh };
