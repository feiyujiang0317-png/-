/* ================================================
   data.js — 侨批数字展馆 · 内容数据层
   所有展区数据完全配置化
   ================================================ */

const LAYOUT_TYPES = {
  COVER: 'cover',
  ENVELOPE: 'envelope',
  CHARACTER: 'character',
  TIMELINE: 'timeline',
  CARDS: 'cards',
  SPLIT: 'split',
  DATA: 'data',
  STARS: 'stars',
  SPLASH: 'splash',
  ENDING: 'ending'
};

const THEMES = {
  DARK_WARM: 'theme-dark-warm',
  OLD_PAPER: 'theme-old-paper',
  PAPER_INK: 'theme-paper-ink',
  INK_SCROLL: 'theme-ink-scroll',
  OCEAN: 'theme-ocean',
  WAR: 'theme-war',
  DATA: 'theme-data',
  NIGHT: 'theme-night',
  BRIGHT: 'theme-bright',
  UNITED_FRONT: 'theme-united-front',
  ENDING: 'theme-ending'
};

/**
 * EXHIBITION_DATA — 展馆数据主结构
 */
const EXHIBITION_DATA = {
  version: "1.0",
  totalZones: 11,
  author: "纸短情长济天下",

  meta: {
    title: "侨批·纸短情长",
    subtitle: "海外华侨家书与汇款的文化记忆",
    pagePrefix: "展区"
  },

  img: function(path) {
    return "assets/images/" + path;
  },

  zones: [
    // ===== ① 封面页 =====
    {
      id: 1,
      slug: "cover",
      title: "侨批·纸短情长",
      subtitle: "海外华侨家书与汇款的文化记忆",
      layoutType: "cover",
      theme: "theme-dark-warm",
      content: {
        headline: "侨批",
        headlineSuffix: "纸短情长",
        subtitle: "海外华侨家书与汇款的文化记忆",
        guideText: "一纸侨批，寄回的不只是汇款，更是跨越山海的牵挂。",
        ctaText: "开始阅读侨批档案",
        footer: "",
        topLeftLabel: "档案入口",
        backgroundType: "radial-gradient",
        centerImage: "assets/images/oil-lamp.png",
        showEnterHint: true,
        enterHintText: "向下滚动探索",
        culturalTags: ["家书", "汇款", "乡愁", "传承"]
      },
      images: ["assets/images/oil-lamp.png"],
      transitionIn: "brighten",
      transitionOut: "fade",
      minStaySeconds: 5,
      autoAdvance: false
    },

    // ===== ② 启封仪式 =====
    {
      id: 2,
      slug: "envelope",
      title: "启封仪式",
      layoutType: "envelope",
      theme: "theme-old-paper",
      content: {
        envelopeImage: "assets/images/old-envelope.png",
        letterPaperImage: "assets/images/qiaopi-letter.png",
        revealText: "见字如面",
        revealTextImage: null,
        description: "一封百年前的家书，等待着被开启",
        archiveInfo: "侨批档案 · 广东潮汕",
        archiveYear: "1932年 · 菲律宾马尼拉寄出",
        animationSequence: [
          { action: "clickToOpen", duration: 3000 },
          { action: "slideOutLetter", duration: 1500 },
          { action: "fadeInText", duration: 2000, text: "见字如面" },
          { action: "autoAdvance", delay: 2500 }
        ]
      },
      images: [
        "assets/images/old-envelope.png",
        "assets/images/qiaopi-letter.png"
      ],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 0,
      autoAdvance: false
    },

    // ===== ③ 「難」字页 =====
    {
      id: 3,
      slug: "nan",
      title: "「難」字",
      layoutType: "character",
      theme: "theme-paper-ink",
      content: {
        pageMainTitle: "一字千钧——一个“难”字，道尽华侨漂泊之苦",
        mainCharacter: "難",
        characterImage: null,
        source: "陈君瑞侨批，1927年",
        annotation: "一字千钧——一个'难'字，道尽华侨漂泊之苦。",
        guideText: "而侨批，正是在这样的艰难岁月中诞生。",
        annotationPosition: "right",
        backgroundTexture: null,
        showAnnotationDelay: 6000,
        emotionWords: [
          "漂洋过海",
          "骨肉分离",
          "谋生艰辛",
          "语言隔阂",
          "思乡难归"
        ],
        // 三大苦难板块
        sections: [
          {
            title: "海上惊涛",
            icon: "🌊",
            text: "木帆船吨位小、抗风浪能力弱，船员稍有不慎便会葬身鱼腹。从汕头到曼谷，海路遥远、风浪无常，多少侨民在登船前便已写下遗书。"
          },
          {
            title: "异乡劳作",
            icon: "⚒️",
            text: "初到南洋的华侨，多从事种植、采锡、搬运等繁重体力劳动。每日劳作十二小时以上，收入微薄，居住条件恶劣，病痛无人照料。"
          },
          {
            title: "生死契约",
            icon: "📜",
            text: "部分契约华工（即'猪仔'）签下卖身契，在矿山、种植园中从事高强度劳动，有人直至病死异乡也未能踏上归途。"
          }
        ],
        // 情感冲击力引用
        quote: "六死三留一回头",
        quoteSource: "——旧时汕头码头民谣"
      },
      images: [],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 6,
      autoAdvance: false
    },

    // ===== ④ 历史时间轴 =====
    {
      id: 4,
      slug: "timeline",
      title: "历史时间轴",
      layoutType: "timeline",
      theme: "theme-ink-scroll",
      content: {
        scrollImage: null,
        autoScrollDuration: 8000,
        subtitle: "跨越一个多世纪的家国记忆",
        nodes: [
          {
            year: "1820",
            icon: "船",
            label: "潮汕华侨下南洋",
            desc: "鸦片战争前，潮汕沿海民众已有人远赴东南亚谋生。早期的华侨移民开始建立海外社区，为日后侨批的产生奠定基础。"
          },
          {
            year: "1890",
            icon: "汇",
            label: "侨批体系逐渐形成",
            desc: "闽粤沿海与南洋之间的银信流通渠道日益成熟，批局（侨批商号）开始在汕头、厦门等地出现，专营华侨汇款与家书业务。"
          },
          {
            year: "1930",
            icon: "盛",
            label: "侨批进入繁荣时期",
            desc: "东南亚华侨社区蓬勃发展，侨批业务达到鼎盛。仅潮汕地区，每年侨汇高达数千万银元，成为侨乡经济的重要支柱。"
          },
          {
            year: "1949",
            icon: "新",
            label: "新中国成立后继续发挥作用",
            detailText: "新中国成立后，侨批作为海外华侨与国内亲人联系的重要纽带，继续发挥汇款赡养家人的作用，直到改革开放前夕。传统侨批网络逐步纳入国家外汇管理体系，华侨汇款成为国家外汇收入的重要来源之一。这一时期的侨批不仅承载着华侨对家乡亲人的思念与经济支持，更成为维系海外华人与祖国血脉联系的文化符号。"
          },
          {
            year: "1988",
            icon: "终",
            label: "传统侨批体系逐渐结束",
            desc: "随着中国金融体系改革和现代银行汇款的普及，传统侨批业务逐步完成历史使命，退出历史舞台。"
          },
          {
            year: "2013",
            icon: "荣",
            label: "侨批档案入选世界记忆名录",
            desc: "广东潮汕侨批档案入选《世界记忆亚太地区名录》，标志着侨批这一独特文化遗产获得国际认可，成为人类共同的文化记忆。"
          }
        ]
      },
      images: [],
      transitionIn: "slideLeft",
      transitionOut: "fade",
      minStaySeconds: 8,
      autoAdvance: true
    },

    // ===== ⑤ 何为侨批 =====
    {
      id: 5,
      slug: "knowledge",
      title: "何为侨批",
      layoutType: "cards",
      theme: "theme-old-paper",
      content: {
        cards: [
          {
            icon: null,
            iconChar: "侨",
            title: "『侨』与『批』",
            body: "海外漂泊的游子",
            subtitle: "『批』= 闽南语『信』",
            expandedText: "在闽南语和潮汕话中，「批」即「信」的意思。侨批，就是海外华侨通过民间渠道寄回国内的家书与汇款合一的特殊邮件。"
          },
          {
            icon: null,
            iconChar: "信",
            title: "一封侨批 = 一封信 + 一份侨汇",
            body: "既是家书，又附汇款",
            expandedText: "侨批的最大特点就是「银信合一」——信封内既有写给家人的书信（家书），又附有寄回家的钱款（侨汇）。一封侨批，承载着情感与经济双重意义。"
          },
          {
            icon: null,
            iconChar: "海",
            title: "跨越山海的情感纽带",
            body: "1864-1988年持续124年",
            expandedText: "从19世纪中叶有记载的侨批体系开始，到20世纪80年代末侨汇体系收尾，侨批跨越了124年的历史长河，是连接海外华侨与祖国故土最坚韧的情感纽带。"
          }
        ],
        staggerDelay: 500
      },
      images: [],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 12,
      autoAdvance: true
    },

    // ===== ⑦ 烽火与统一战线（合并） =====
    {
      id: 7,
      slug: "war",
      title: "华侨与抗战",
      layoutType: "split",
      theme: "theme-war",
      content: {
        splitMode: "left-right",
        leftContent: {
          type: "text",
          title: "烽火侨批",
          subtitle: "抗战时期，侨批是生命线与武器",
          body: "1937年抗日战争全面爆发后，侨批扮演了不可替代的历史角色。1939年侨汇总额达1.56亿美元，与当年国民政府军费基本持平——这意味着抗战的每两块钱中，就有一块来自华侨汇款。\n\n毛泽东同志指出：「华侨是革命之母。」海外华侨通过侨批汇款、回国参战，形成了最广泛的抗日民族统一战线。",
          textAlign: "left",
          highlight: "1.56亿美元 | 侨汇占抗战军费50%",
          highlightSource: "1939年数据"
        },
        rightContent: {
          type: "hotspots",
          items: [
            {
              id: "dongxing-road",
              label: "东兴汇路",
              title: "东兴汇路",
              desc: "1942年日军占领东南亚后，传统侨批通道被切断。潮汕批局开辟了一条秘密通道：从泰国、越南经广西东兴镇入境，再经广西、广东抵达潮汕。这条被誉为「东兴汇路」的秘密通道，在烽火岁月中维系着侨汇生命线。",
              source: "广东省档案馆藏侨批档案"
            },
            {
              id: "joint-reply",
              label: "周恩来联名回批",
              title: "周恩来等联名回批",
              desc: "1938年，旅泰侨胞苏君谦、郭子纲、黄奕三人捐资200元支援延安抗大办学，通过「增顺侨批局」以「口批」方式汇寄。1938年9月21日，周恩来、叶剑英、潘汉年、廖承志联名发出回批，写道：「先生等关怀祖国抗战人才之养成，爱国热情，殊堪钦敬。」这是党的统一战线工作在侨批领域的生动实践。",
              source: "汕头侨批文物馆收藏"
            },
            {
              id: "situmeitang",
              label: "司徒美堂",
              title: "司徒美堂（1868-1955）",
              desc: "美洲华侨领袖，洪门致公堂元老。抗战爆发后以七旬高龄发起成立「纽约华侨抗日救国筹饷总会」，募捐1400万美元。司徒美堂领导的美洲华侨抗日救亡运动，是抗日民族统一战线的光辉典范。1949年以美洲华侨代表身份参加开国大典，毛泽东主席为其题词「华侨楷模，光辉旗帜」。",
              source: "中国侨网 / 广东省侨务办"
            },
            {
              id: "flying-tigers",
              label: "华侨飞虎队",
              title: "华侨飞虎队员",
              desc: "抗战期间，数以千计的华侨青年回国参军参战。美国陆军航空队第14航空队（「飞虎队」）中有大量华裔飞行员和地勤人员。他们当中许多人通过侨批与国内家人保持联系，有些人的最后一封家书就成了永别。",
              source: "中国华侨历史博物馆"
            }
          ]
        },
        extraOverlay: null
      },
      images: [],
      transitionIn: "brighten",
      transitionOut: "fade",
      minStaySeconds: 20,
      autoAdvance: true
    },

    // ===== ⑧ 经济血脉 =====
    {
      id: 8,
      slug: "economy",
      title: "经济血脉",
      layoutType: "data",
      theme: "theme-data",
      content: {
        title: "经济血脉",
        dataPoints: [
          {
            value: "131.2亿",
            unit: "美元",
            label: "1864-1988年侨汇总额",
            description: "跨越124年的侨汇总和，是近代中国最重要的外汇来源之一",
            source: "据《中国侨汇研究》等学术文献综合估算"
          },
          {
            value: "1.56亿",
            unit: "美元",
            label: "1939年侨汇",
            description: "与当年国民政府军费基本持平",
            source: "《抗战时期侨汇问题研究》"
          },
          {
            value: "50%",
            label: "侨汇占军费比例",
            description: "抗战期间，每两块钱军费中约有一块来自华侨汇款",
            source: "《华侨与抗日战争》"
          },
          {
            value: "124",
            unit: "年",
            label: "侨批历史跨度",
            description: "从1864年有记载的侨批体系到1988年收尾",
            source: "综合史料"
          }
        ],
        backgroundUrl: null,
        dataChartImage: null,
        flowAnimation: true
      },
      images: [],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 15,
      autoAdvance: true
    },

    // ===== ⑨ 人物星河 =====
    {
      id: 9,
      slug: "stars",
      title: "人物星河",
      layoutType: "stars",
      theme: "theme-night",
      content: {
        background: null,
        title: "人物星河",
        subtitle: "五个人物，五个故事，一段历史",
        figures: [
          {
            id: "chenjunrui",
            name: "陈君瑞",
            tag: "「難」字侨批·1927年",
            portrait: null,
            iconChar: "難",
            story: "印尼华侨陈君瑞在寄回家乡的侨批信封上，写下一个巨大的「難」字。一个字，道尽过番谋生的千般艰辛。这封侨批原件至今保存完好，是侨批文物中最撼动人心的存在之一。",
            importance: "P0"
          },
          {
            id: "chenlianyin",
            name: "陈莲音",
            tag: "卖霜女番客",
            portrait: null,
            iconChar: "霜",
            story: "旅居新加坡的女侨胞陈莲音寄回侨批，信中写道「街边卖霜尚无从维持生活」——「卖霜」即卖冰淇淋。一位华侨女性在异国他乡的艰辛生存，透过这几行字穿越时空扑面而来。",
            importance: "P0"
          },
          {
            id: "yangluyi",
            name: "杨露义",
            tag: "八十一封家书",
            portrait: null,
            iconChar: "家",
            story: "杨露义旅居海外期间，先后寄回八十一封侨批家书。每一封信都是一份牵挂，每一笔汇款都是一份责任。八十一封家书，丈量的是从南洋到潮汕的海路距离，承载的是割舍不断的血脉亲情。",
            importance: "P0"
          },
          {
            id: "linchaoguang",
            name: "林朝光",
            tag: "三千言长信·1957年",
            portrait: null,
            iconChar: "长",
            story: "1957年，林朝光从海外寄回一封长达三千余言的家书。在通常只有数十字或百余字的侨批中，这封「长篇巨制」堪称罕见。信中详述异国生活点滴，字字句句都是对故土亲人的深切思念。",
            importance: "P0"
          },
          {
            id: "hongmingtong",
            name: "洪铭通",
            tag: "写批人·四不写",
            portrait: null,
            iconChar: "笔",
            story: "潮汕著名「写批人」，代写回批六十余年。坚守「四不写」原则：批款数字不清不写、夸大儿孙不肖求多寄钱不写、装穷叫苦有辱国格不写、挑拨离间伤天害理不写。其故事已被改编为电影《给阿嬷的情书》。",
            importance: "P0"
          }
        ]
      },
      images: [],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 0,
      autoAdvance: false
    },

    // ===== ⑩ 当代意义 =====
    {
      id: 10,
      slug: "contemporary",
      title: "纸短情长·精神永续",
      layoutType: "splash",
      theme: "theme-bright",
      content: {
        title: "纸短情长·精神永续",
        subtitle: "从历史走向未来",
        body: "侨批不仅是过去的记忆，更是数字时代文化自信的活水源泉。每一封侨批都是一条文化DNA链，连接着海内外中华儿女的共同情感。",
        quote: "「每一封侨批都是一条文化DNA链」",
        quoteSource: "——文化研究者",
        backgroundOverlay: null,
        flowElement: null,
        decorativeImage: null,
        externalLink: { label: "了解更多", url: "https://www.nlc.cn/" }
      },
      images: [],
      transitionIn: "brighten",
      transitionOut: "fade",
      minStaySeconds: 15,
      autoAdvance: true
    },

    // ===== ⑪ 尾页 =====
    {
      id: 11,
      slug: "ending",
      title: "致谢",
      layoutType: "ending",
      theme: "theme-ending",
      content: {
        headline: "纸短情长·精神永续",
        subtitle: "感谢您的观看",
        centerImage: null,
        credits: [
          "特别致敬所有写批人与他们的后人",
          "——",
          "纸短情长济天下 · 全体成员",
          "——",
          "特别鸣谢：国家图书馆「烽火侨批」主题展",
          "汕头侨批文物馆 · 中国华侨历史博物馆",
          "——",
          "交互式数字展馆 · 课堂展示用",
          "2025年6月"
        ],
        backgroundType: "radial-gradient",
        showEnterHint: false,
        autoDimSeconds: 15
      },
      images: [],
      transitionIn: "fade",
      transitionOut: "fade",
      minStaySeconds: 15,
      autoAdvance: false
    }
  ]
};

/* ===== Helper: Get zone data by ID ===== */
function getZoneData(zoneId) {
  return EXHIBITION_DATA.zones.find(z => z.id === zoneId) || null;
}

/* ===== Helper: Get total zones ===== */
function getTotalZones() {
  return EXHIBITION_DATA.totalZones;
}

/* ===== Image path mapper ===== */
function imgPath(filename) {
  return 'assets/images/' + filename;
}
