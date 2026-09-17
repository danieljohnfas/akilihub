import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { countries, regions, districts } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

const tzRegionsAndDistricts = [
  {
    region: 'Dar es Salaam',
    districts: ['Ilala', 'Kinondoni', 'Temeke', 'Kigamboni', 'Ubungo']
  },
  {
    region: 'Mwanza',
    districts: ['Nyamagana', 'Ilemela', 'Sengerema', 'Magu', 'Misungwi', 'Kwimba', 'Ukerewe']
  },
  {
    region: 'Arusha',
    districts: ['Arusha City', 'Arusha District', 'Meru', 'Monduli', 'Karatu', 'Ngorongoro', 'Longido']
  },
  {
    region: 'Dodoma',
    districts: ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa']
  },
  {
    region: 'Mbeya',
    districts: ['Mbeya City', 'Mbeya District', 'Chunya', 'Kyela', 'Mbarali', 'Rungwe', 'Busokelo']
  },
  {
    region: 'Zanzibar Urban/West',
    districts: ['Magharibi', 'Mjini']
  },
  {
    region: 'Zanzibar North',
    districts: ['Kaskazini A', 'Kaskazini B']
  },
  {
    region: 'Zanzibar South',
    districts: ['Kati', 'Kusini']
  },
  {
    region: 'Tanga',
    districts: ['Tanga City', 'Bumbuli', 'Handeni', 'Kilindi', 'Korogwe', 'Lushoto', 'Mkinga', 'Muheza', 'Pangani']
  },
  {
    region: 'Morogoro',
    districts: ['Morogoro Municipality', 'Morogoro District', 'Gairo', 'Kilombero', 'Kilosa', 'Malinyi', 'Mvomero', 'Ulanga']
  },
  {
    region: 'Kilimanjaro',
    districts: ['Moshi Municipality', 'Moshi District', 'Hai', 'Mwanga', 'Rombo', 'Same', 'Siha']
  },
  {
    region: 'Tabora',
    districts: ['Tabora Municipality', 'Igunga', 'Kaliua', 'Nzega', 'Sikonge', 'Urambo', 'Uyui']
  },
  {
    region: 'Kigoma',
    districts: ['Kigoma-Ujiji', 'Kigoma District', 'Buhigwe', 'Kakonko', 'Kasulu', 'Kibondo', 'Uvinza']
  },
  {
    region: 'Shinyanga',
    districts: ['Shinyanga Municipality', 'Shinyanga District', 'Kahama', 'Kishapu']
  },
  {
    region: 'Mtwara',
    districts: ['Mtwara Municipality', 'Mtwara District', 'Masasi', 'Nanyumbu', 'Newala', 'Tandahimba']
  },
  {
    region: 'Lindi',
    districts: ['Lindi Municipality', 'Lindi District', 'Kilwa', 'Liwale', 'Machinga', 'Nachingwea', 'Ruangwa']
  }
];

async function run() {
  console.log('Generating TZ Dropdowns (Regions & Districts)...');
  
  // 1. Get Country ID
  const [{ id: countryId }] = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, 'TZ'))
    .limit(1);

  let regionsInserted = 0;
  let districtsInserted = 0;

  for (const item of tzRegionsAndDistricts) {
    // Upsert Region (or select if it exists)
    let regionResult = await db
      .select({ id: regions.id })
      .from(regions)
      .where(eq(regions.name, item.region))
      .limit(1);
      
    let regionId: string;
    
    if (regionResult.length === 0) {
      const inserted = await db.insert(regions).values({
        countryId,
        name: item.region
      }).returning({ id: regions.id });
      regionId = inserted[0].id;
      regionsInserted++;
    } else {
      regionId = regionResult[0].id;
    }

    // Upsert Districts
    for (const districtName of item.districts) {
      const districtResult = await db
        .select({ id: districts.id })
        .from(districts)
        .where(eq(districts.name, districtName))
        .limit(1);
        
      if (districtResult.length === 0) {
        await db.insert(districts).values({
          regionId,
          name: districtName
        });
        districtsInserted++;
      }
    }
  }

  console.log(`Finished inserting dropdown data.`);
  console.log(`Regions inserted: ${regionsInserted}`);
  console.log(`Districts inserted: ${districtsInserted}`);
  
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
