// backend/database/seed-faculty-dataset.js
import db from '../src/config/database.js';
import bcrypt from 'bcryptjs';
import { logger } from '../src/utils/logger.js';

export const persons = [
  {
    id: 1,
    name: "Sri.L.Hari Prakash",
    cfms_id: "14406143",
    email: "aee@gmail.com",
    designation: "Assistant Engineer",
    department: "CIVIL",
    mobile: "8008484236",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 2,
    name: "Vemuri KrishnaAnila",
    cfms_id: "1009385182",
    email: "vkaneela.maths@gmail.com",
    designation: "Assistant Professor",
    department: "Math",
    mobile: "9704117814",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 3,
    name: "Sri.K.Srinivasa Rao",
    cfms_id: "15081908",
    email: "admins@jntugbcev.edu.in",
    designation: "SA",
    department: "Administration",
    mobile: "9247739489",
    job_status: "N/A",
    gender: "male"
  },
  {
    id: 4,
    name: "B.Tirumula Rao",
    cfms_id: "1000218038",
    email: "btirimula.it@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "IT",
    mobile: "8374033622",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 5,
    name: "G. Jaya Suma",
    cfms_id: "15166317",
    email: "gjsuma.it@jntugvcev.edu.in",
    designation: "Professor",
    department: "IT",
    mobile: "8897344078",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 6,
    name: "Ch. Bindu Madhuri",
    cfms_id: "1000218016",
    email: "chbmadhuri.it@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "IT",
    mobile: "9704955762",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 7,
    name: "Anil Wurity",
    cfms_id: "1000218088",
    email: "anilwurity.it@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "IT",
    mobile: "8500669667",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 8,
    name: "Dr.G.J. Naga Raju",
    cfms_id: "1000217979",
    email: "gjnraju.phy@jntugvcev.edu.in",
    designation: "Associate Professor",
    department: "Physics",
    mobile: "9440131535",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 9,
    name: "Dr. M. Sowbhagya Lakshmi",
    cfms_id: "1000218160",
    email: "mslakshmi.chem@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "Chemistry",
    mobile: "6301178528",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 10,
    name: "Dr. P. Sree Devi",
    cfms_id: "1000218176",
    email: "sreedevip.cmba@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "Commerce",
    mobile: "9493759290",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 11,
    name: "B. Nalini",
    cfms_id: "1000218101",
    email: "nalinib.ece@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ECE",
    mobile: "9912609545",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 12,
    name: "K. Babulu",
    cfms_id: "1000218115",
    email: "kapbbl.ece@jntugvcev.edu.in",
    designation: "Professor",
    department: "ECE",
    mobile: "9440780175",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 13,
    name: "K. Chandra Bhushana Rao",
    cfms_id: "1000217999",
    email: "cbraokota.ece@jntugvcev.edu.in",
    designation: "Professor",
    department: "ECE",
    mobile: "8374033688",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 14,
    name: "R. Gurunadha",
    cfms_id: "1000221742",
    email: "gururavva.ece@jntugvcev.edu.in",
    designation: "Associate Professor",
    department: "ECE",
    mobile: "8374033499",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 15,
    name: "G. Appala Naidu",
    cfms_id: "1000218015",
    email: "ganaidu.ece@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ECE",
    mobile: "9490731074",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 16,
    name: "M. Hema",
    cfms_id: "1000218040",
    email: "mhema.ece@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ECE",
    mobile: "9246660360",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 17,
    name: "P. Aruna Kumari",
    cfms_id: "1000218022",
    email: "arunakumarip.cse@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "CSE",
    mobile: "9440520606",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 18,
    name: "D. Rajya Lakshmi",
    cfms_id: "1000218133",
    email: "rajyalakshmi.cse@jntugvcev.edu.in",
    designation: "Professor",
    department: "CSE",
    mobile: "9618016555",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 19,
    name: "R. Rajeswara Rao",
    cfms_id: "1000218134",
    email: "raob4u.cse@jntugvcev.edu.in",
    designation: "Professor",
    department: "CSE",
    mobile: "9618016556",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 20,
    name: "N. Venkatesh",
    cfms_id: "1000218020",
    email: "nvenkatesh.cse@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "CSE",
    mobile: "9573064031",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 21,
    name: "Rolangi D.D.V. Siva Ram",
    cfms_id: "1000218036",
    email: "rddvsr.cse@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "CSE",
    mobile: "8374033655",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 22,
    name: "Dr. C. Neelima Devi",
    cfms_id: "1000218099",
    email: "cneelima.me@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ME",
    mobile: "9849965809",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 23,
    name: "Sri V. Mani Kumar",
    cfms_id: "1000218023",
    email: "velugulamani.me@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ME",
    mobile: "9849965810",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 24,
    name: "Dr. K. Srinivasa Prasad",
    cfms_id: "1000217998",
    email: "ksprasad.me@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "ME",
    mobile: "8374293399",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 25,
    name: "A. Padmaja",
    cfms_id: "1000218014",
    email: "apadmaja.eee@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "EEE",
    mobile: "8331095784",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 26,
    name: "K. Sri Kumar",
    cfms_id: "1000217981",
    email: "ksrikumar.eee@jntugvcev.edu.in",
    designation: "Professor",
    department: "EEE",
    mobile: "8331953650",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 27,
    name: "V. S. Vakula",
    cfms_id: "15040168",
    email: "vakulavs.eee@jntugvcev.edu.in",
    designation: "Assistant Professor",
    department: "EEE",
    mobile: "9908725855",
    job_status: "Regular",
    gender: "female"
  },
  {
    id: 28,
    name: "Chodavarapu GiridharKumar",
    cfms_id: "1009385192",
    email: "giridharkumar.ce@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CE",
    mobile: "9966513883",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 29,
    name: "Abdul Kurshid",
    cfms_id: "1009385191",
    email: "abdulkhurshid.me@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ME",
    mobile: "8919533043",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 30,
    name: "Saka Rajitha",
    cfms_id: "1009385181",
    email: "rajithasaka.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "9553653769",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 31,
    name: "Addepalli VenkataSuryaGowtham",
    cfms_id: "1009385175",
    email: "gowtham.me@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ME",
    mobile: "6301824958",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 32,
    name: "Tallapragada Sai Datta Phanindranath",
    cfms_id: "1009385172",
    email: "phanindranath.ce@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CE",
    mobile: "8688160897",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 33,
    name: "Bula Ratna KumarAmbedkar",
    cfms_id: "1009385169",
    email: "ambedkar.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "7013580721",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 34,
    name: "Mallela KomaleswaraRao",
    cfms_id: "1009385168",
    email: "komalmallela.me@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ME",
    mobile: "9989948428",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 35,
    name: "Shaik Karimulla",
    cfms_id: "1009385158",
    email: "karimullasheikh.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "9989843218",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 36,
    name: "Kolli VenkataNaidu",
    cfms_id: "1009385128",
    email: "kvnaidu.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "8374722699",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 37,
    name: "Dasari JaganMohan",
    cfms_id: "1009385120",
    email: "jaganmohan.ce@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CE",
    mobile: "9912991008",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 38,
    name: "Pilli SreenivasulaReddy",
    cfms_id: "1009385109",
    email: "psr.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "7386071025",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 39,
    name: "Panigrahi SivaKumar",
    cfms_id: "1009385106",
    email: "sivakumar.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "9032475841",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 40,
    name: "Ramba BalaMuraliKrishna",
    cfms_id: "1009385097",
    email: "balamurali.ce@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CE",
    mobile: "9440311324",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 41,
    name: "Azamira SivasankarNaik",
    cfms_id: "1009385089",
    email: "siva.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "9989187658",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 42,
    name: "Y Chittemma",
    cfms_id: "1002894067",
    email: "chittemma.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "8985628991",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 43,
    name: "Vana LakshmiPrasad",
    cfms_id: "1009385231",
    email: "vlprasad.cse@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CSE",
    mobile: "8978252737",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 44,
    name: "Bonthula Sridurga",
    cfms_id: "1009385213",
    email: "sridurga.eng@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "BS&HSS",
    mobile: "9491627084",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 45,
    name: "Manda ChinaRaju",
    cfms_id: "1009385212",
    email: "chinnaraju.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9704434150",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 46,
    name: "Mallampalli KrishnaPriya",
    cfms_id: "1009385211",
    email: "krishnapriya.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9490929487",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 47,
    name: "Jallu Sateesh",
    cfms_id: "1009385193",
    email: "jallusateesh.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9492015152",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 48,
    name: "B Manasa",
    cfms_id: "1009385183",
    email: "bmanasa.it@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "IT",
    mobile: "8008328669",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 49,
    name: "Suragala Ashok",
    cfms_id: "1009385176",
    email: "ashok.cse@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CSE",
    mobile: "9494464632",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 50,
    name: "Botsa DharmaRao",
    cfms_id: "1009385174",
    email: "dharmaraobotsa.chem@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "BS&HSS",
    mobile: "9441935979",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 51,
    name: "Kotla Swathi",
    cfms_id: "1009385173",
    email: "swathikotla.phy@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "BS&HSS",
    mobile: "9652138849",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 52,
    name: "Kollu Srikanth",
    cfms_id: "1009385170",
    email: "ksrikanth.it@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "IT",
    mobile: "9440882643",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 53,
    name: "Pynam Venkateswarulu",
    cfms_id: "1009385167",
    email: "pvenkat.it@jntugvcev.edu.in",
    designation: "Asst.Prof.",
    department: "IT",
    mobile: "8333858288",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 54,
    name: "Kaki VeerRaju",
    cfms_id: "1009385160",
    email: "kvraju.ece@jntugvcev.edu.in",
    designation: "Asst.Prof.",
    department: "ECE",
    mobile: "9703481843",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 55,
    name: "Nammi SureshKumar",
    cfms_id: "1009385159",
    email: "sureshnammi.eng@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "BS&HSS",
    mobile: "7036670025",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 56,
    name: "Potula PavanKumar",
    cfms_id: "1009385157",
    email: "pavan.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "9550045200",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 57,
    name: "Molli GeethaMadhuriYadav",
    cfms_id: "1009385148",
    email: "mgmadhuri.it@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "IT",
    mobile: "8341499617",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 58,
    name: "Varanasi SantoshKumar",
    cfms_id: "1009385149",
    email: "vskumar.maths@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "BS&HSS",
    mobile: "8464833549",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 59,
    name: "Rajeti RojeSpandana",
    cfms_id: "1009385137",
    email: "rojespandanar.it@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "IT",
    mobile: "8897839888",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 60,
    name: "Langoju KrishnaChaitanya",
    cfms_id: "1009385136",
    email: "krishnachaitanya.me@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ME",
    mobile: "8341066619",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 61,
    name: "Shaik Naseema",
    cfms_id: "1009385127",
    email: "shaiknaseema03.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "9160139607",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 62,
    name: "VeeraGanta VijayaSanthi",
    cfms_id: "1009385108",
    email: "vijayasanthiveeraganta.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9505005996",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 63,
    name: "Arnuri Srinivasulu",
    cfms_id: "1009385107",
    email: "asrinivasulu.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "7095756558",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 64,
    name: "Yerra VAmardeep",
    cfms_id: "1009385098",
    email: "amardeep.cse@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CSE",
    mobile: "9032996129",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 65,
    name: "Vemulada NarayanaRao",
    cfms_id: "1009385090",
    email: "narayanarao.cse@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "CSE",
    mobile: "7702461522",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 66,
    name: "Kollu VSatyanarayana",
    cfms_id: "1009385060",
    email: "kvsatyanarayana.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9492015152",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 67,
    name: "Banothu ChennaKesava",
    cfms_id: "1009385059",
    email: "bchennakesava.met@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "MET",
    mobile: "8886449805",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 68,
    name: "Tammineni Sirisha",
    cfms_id: "1009385058",
    email: "sirisha.eee@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "EEE",
    mobile: "9989187658",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 69,
    name: "Madhumita Chanda",
    cfms_id: "1003102802",
    email: "madhumitachanda.it@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "IT",
    mobile: "9642248001",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 70,
    name: "Kona Anusha Yadav",
    cfms_id: "1002846720",
    email: "konaanushayadav.ece@jntugvcev.edu.in",
    designation: "Asst.Prof. (Contract)",
    department: "ECE",
    mobile: "9959667395",
    job_status: "contract",
    gender: "female"
  },
  {
    id: 71,
    name: "Dr.G.Swami Naidu",
    cfms_id: "15152305",
    email: "gsnaidu.met@jntugvcev.edu.in",
    designation: "Professor",
    department: "MET",
    mobile: "9963001596",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 72,
    name: "A.V. Papa Rao",
    cfms_id: "1000218072",
    email: "paparao.maths@jntugvcev.edu.in",
    designation: "Professor",
    department: "Maths",
    mobile: "9963001597",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 73,
    name: "TSN Murthy",
    cfms_id: "1000218073",
    email: "tsnmurthy.ece@jntugvcev.edu.in",
    designation: "Professor",
    department: "ECE",
    mobile: "9963001598",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 74,
    name: "Prof K Vali",
    cfms_id: "1000218074",
    email: "vali.maths@jntugvcev.edu.in",
    designation: "Professor",
    department: "Maths",
    mobile: "9963001596",
    job_status: "Regular",
    gender: "male"
  },
  {
    id: 75,
    name: "CHEVALA VENKATA RAMANA",
    cfms_id: "1009385201",
    email: "chvenkataramana.eee@jntugvcev.edu.in",
    designation: "Asst Professor",
    department: "EEE",
    mobile: "9441567983",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 76,
    name: "RAJESH DAVALA",
    cfms_id: "1009385232",
    email: "rajesh.me@jntugvcev.edu.in",
    designation: "Asst.Professor",
    department: "ME",
    mobile: "9052310110",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 77,
    name: "VENKATA SATYA DURGA MANOHAR SAHU",
    cfms_id: "1009385221",
    email: "sahu.eee@jntugvcev.edu.in",
    designation: "Asst.Professor",
    department: "EEE",
    mobile: "8801100258",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 78,
    name: "Relli Santha Rao",
    cfms_id: "1009385146",
    email: "santharaorelli.eng@jntugvcev.edu.in",
    designation: "Asst.Professor",
    department: "BS&HSS",
    mobile: "9603891774",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 79,
    name: "Potula Laxmana Sunand",
    cfms_id: "1009385147",
    email: "sunand.eco@jntugvcev.edu.in",
    designation: "Asst.Professor",
    department: "MET",
    mobile: "9603891775",
    job_status: "contract",
    gender: "male"
  },
  {
    id: 80,
    name: "vemuri Krishna Aneela",
    cfms_id: "15071465",
    email: "vkaneela.maths@jntugvcev.edu.in",
    designation: "Asst.Professor",
    department: "Maths",
    mobile: "9704117814",
    job_status: "contract",
    gender: "female"
  }
];

async function seedFaculty() {
  await db.connect();
  logger.info('🌱 Seeding complete faculty dataset with gender into MySQL...');

  const facultyHash = await bcrypt.hash('faculty@123', 10);
  const seenEmails = new Set();
  const seenCfms = new Set();

  let inserted = 0;

  for (const person of persons) {
    let email = (person.email || '').toLowerCase().trim();
    if (!email) {
      email = `faculty_${person.id}@jntugvcev.edu.in`;
    }

    // Skip true duplicates
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    let cfms = (person.cfms_id || '').trim();
    if (cfms && seenCfms.has(cfms)) {
      cfms = `${cfms}_${person.id}`;
    }
    if (cfms) seenCfms.add(cfms);

    const name = person.name.trim();
    const designation = person.designation.trim();
    const department = person.department.trim() || 'General';
    const mobile = (person.mobile || '').trim();
    const gender = (person.gender || 'male').toLowerCase().trim();

    // Strict normalization: 'Regular' or 'contract'
    const rawStatus = (person.job_status || '').toLowerCase().trim();
    const jobStatus = rawStatus === 'regular' ? 'Regular' : 'contract';

    const userId = `fac-${person.id}`;

    await db.query(`
      INSERT INTO users (id, cfms_id, email, password_hash, name, designation, department, mobile, gender, job_status, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'faculty', 1)
      ON DUPLICATE KEY UPDATE
        cfms_id = VALUES(cfms_id),
        name = VALUES(name),
        designation = VALUES(designation),
        department = VALUES(department),
        mobile = VALUES(mobile),
        gender = VALUES(gender),
        job_status = VALUES(job_status),
        password_hash = VALUES(password_hash),
        is_active = 1
    `, [
      userId,
      cfms || null,
      email,
      facultyHash,
      name,
      designation,
      department,
      mobile,
      gender,
      jobStatus
    ]);

    inserted += 1;
  }

  logger.info(`✅ Successfully registered/updated ${inserted} faculty members with gender in MySQL.`);
  await db.close();
}

if (process.argv[1] && process.argv[1].includes('seed-faculty-dataset.js')) {
  seedFaculty().catch((err) => {
    console.error('Faculty seed failed:', err);
    process.exit(1);
  });
}
