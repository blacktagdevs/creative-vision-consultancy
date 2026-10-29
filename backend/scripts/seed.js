// Loads the copy from the client's refresh brief (CVC Website Refresh Notes).
//
//   npm run seed                 real content only: the six services, published,
//                                and the seven portfolio galleries as drafts
//                                (they have no photos until she uploads them)
//   npm run seed -- --placeholders
//                                also publishes the galleries with Unsplash
//                                stand-in photos and adds a sample testimonial,
//                                for local dev and the client style review
//
// Only fills empty tables, so it's safe to re-run; pass --reset to wipe the
// managed tables first (refused when NODE_ENV=production).
import { pool, withTransaction } from '../src/db.js'
import { slugify } from '../src/lib/validation.js'

const args = new Set(process.argv.slice(2))
const placeholders = args.has('--placeholders')
const reset = args.has('--reset')

const SERVICES = [
  {
    category: 'wedding',
    name: 'Full Planning',
    description:
      'Full-service planning is for clients who want comprehensive support from start to finish with every detail thoughtfully managed. From vision development and vendor coordination to structured timelines and logistics, we guide the entire planning process with precision and care.\n\nWe prioritize both client and guest experience, ensuring each event feels seamless, personal, and well-executed. With proactive communication and calm leadership on event day, we bring your vision to life while you enjoy every moment.',
    price_prefix: 'Starts at',
    price_from_cents: 600000,
  },
  {
    category: 'wedding',
    name: 'Partial Planning',
    description:
      'Partial planning is ideal for clients who have begun the planning process and need professional guidance to refine details and bring everything together. We step in to provide strategic support, vendor coordination, timeline development, and design clarity while ensuring nothing is overlooked.\n\nWith a focus on organization, communication, and seamless execution, we help transform your plans into a well-curated event experience.',
    price_prefix: 'Starts at',
    price_from_cents: 450000,
  },
  {
    category: 'wedding',
    name: 'Month-of Coordination',
    description:
      'Month-of coordination is designed for clients who have planned their event and need professional oversight to ensure everything runs smoothly. We take over final logistics, confirm details with vendors, create a detailed timeline, and manage communication leading up to the event.\n\nOn event day, we provide calm leadership, real-time problem-solving, and efficient execution so you can relax and fully enjoy the experience.',
    closing_note: 'Pricing may vary based on guest count, number of vendors, and event scope.',
    price_prefix: 'Begins at',
    price_from_cents: 200000,
  },
  {
    category: 'social_corporate',
    name: 'Full Vision Planning',
    description:
      'Planning and coordination for birthday celebrations, brand events, and corporate gatherings. Services include logistics, vendor management, timelines, and on-site execution.',
  },
  {
    category: 'social_corporate',
    name: 'Executive Planning',
    description:
      'Day-of event coordination is focused on on-site management and seamless execution. From overseeing vendor arrivals and setup to managing the flow of the event and guest experience, we ensure everything runs according to plan.\n\nWe act as the point of contact throughout the event, making quick adjustments as needed and maintaining a smooth, organized atmosphere so hosts can be fully present and enjoy their celebration.',
  },
  {
    category: 'social_corporate',
    name: 'Consulting',
    description:
      'Ideal for clients who want professional guidance, clarity, and direction without full planning services. These one-on-one sessions are designed to help you move forward with confidence.\n\nWhether you’re feeling stuck, overwhelmed, or simply want expert insight, consultations focus on refining your vision, organizing next steps, and addressing specific planning or design challenges.',
    bullets_heading: 'Sessions may include',
    bullets: [
      'Event vision and design direction',
      'Timeline guidance and flow',
      'Vendor strategy and recommendations',
      'Budget prioritization',
      'Cultural or logistical considerations',
      'Problem-solving and planning clarity',
    ],
    closing_note: 'Consultations are available virtually or in person and tailored to your specific needs.',
  },
]

const PORTFOLIO = [
  { title: 'Ogechi & Richard Flowers', category: 'wedding' },
  { title: 'Ify & Oscar Nwasofer', category: 'wedding' },
  { title: 'Cynthia & Curtis Wright', category: 'wedding' },
  { title: 'Chelsie & Tanner Dixon', category: 'wedding' },
  { title: 'Phil’s Birthday Party', category: 'social' },
  { title: 'Engagement', category: 'engagement' },
  { title: 'Umu Igbo Unite Gala', category: 'corporate' },
]

// Stand-ins from the design drafts. Never seeded unless --placeholders.
const UNSPLASH = [
  'photo-1519741497674-611481863552',
  'photo-1532712938310-34cb3982ef74',
  'photo-1519671482749-fd09be7ccebf',
  'photo-1511795409834-ef04bbd61622',
  'photo-1530023367847-a683933f4172',
  'photo-1606216794074-735e91aa2c92',
  'photo-1519225421980-715cb0215aed',
  'photo-1464366400600-7168b8af9bc3',
  'photo-1606800052052-a08af7148866',
].map((id) => `https://images.unsplash.com/${id}?w=1600&q=80`)

async function isEmpty(client, table) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${table}`)
  return rows[0].n === 0
}

async function run() {
  if (reset && process.env.NODE_ENV === 'production') throw new Error('Refusing --reset in production')

  await withTransaction(async (client) => {
    if (reset) {
      await client.query('TRUNCATE services, portfolio_photos, portfolio_items, testimonials CASCADE')
      console.log('- reset managed tables')
    }

    if (await isEmpty(client, 'services')) {
      for (const [i, s] of SERVICES.entries()) {
        await client.query(
          `INSERT INTO services (category, name, slug, description, bullets_heading, bullets,
                                 closing_note, price_prefix, price_from_cents, sort_order, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published')`,
          [s.category, s.name, slugify(s.name), s.description, s.bullets_heading ?? null,
           s.bullets ?? [], s.closing_note ?? null, s.price_prefix ?? 'Starts at',
           s.price_from_cents ?? null, i]
        )
      }
      console.log(`+ ${SERVICES.length} services`)
    } else console.log('= services already present')

    if (await isEmpty(client, 'portfolio_items')) {
      for (const [i, p] of PORTFOLIO.entries()) {
        const { rows: [item] } = await client.query(
          `INSERT INTO portfolio_items (title, slug, category, sort_order, status)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [p.title, slugify(p.title), p.category, i, placeholders ? 'published' : 'draft']
        )
        if (placeholders) {
          // Rotate through the stand-ins so each gallery opens on a different cover.
          for (let n = 0; n < 6; n++) {
            await client.query(
              `INSERT INTO portfolio_photos (portfolio_item_id, image_url, alt, sort_order)
               VALUES ($1,$2,$3,$4)`,
              [item.id, UNSPLASH[(i + n) % UNSPLASH.length], `Placeholder photo for ${p.title}`, n]
            )
          }
        }
      }
      console.log(`+ ${PORTFOLIO.length} portfolio galleries (${placeholders ? 'published, placeholder photos' : 'drafts, no photos'})`)
    } else console.log('= portfolio already present')

    if (placeholders && (await isEmpty(client, 'testimonials'))) {
      await client.query(
        `INSERT INTO testimonials (quote, attribution, event_label, sort_order, status)
         VALUES ($1,$2,$3,0,'published')`,
        [
          'From the very first call, I could feel the calm. By event day, every detail had been considered — and I got to actually be a guest at my own wedding.',
          'Placeholder Review',
          'Swap for a real client review',
        ]
      )
      console.log('+ 1 placeholder testimonial')
    }
  })
}

run()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    pool.end().finally(() => process.exit(1))
  })
