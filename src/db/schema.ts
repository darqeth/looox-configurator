import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'

// Enums
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
])
export const configStatusEnum = pgEnum('config_status', [
  'draft',
  'saved',
  'ordered',
])
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
])
export const optionGroupTypeEnum = pgEnum('option_group_type', [
  'single',
  'multi',
  'toggle',
])

// Profiles (extends Supabase auth.users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // same as auth.users.id
  email: text('email').notNull(),
  full_name: text('full_name'),
  company: text('company'),
  phone: text('phone'),
  address: text('address'),
  avatar_url: text('avatar_url'),
  approval_status: approvalStatusEnum('approval_status')
    .notNull()
    .default('pending'),
  is_admin: boolean('is_admin').notNull().default(false),
  tier: text('tier').notNull().default('Studio'), // Studio | Signature | Atelier
  price_multiplier: numeric('price_multiplier', { precision: 5, scale: 4 })
    .notNull()
    .default('1.0000'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Products (mirrors, furniture in the future)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull().default('mirror'), // mirror | furniture
  description: text('description'),
  base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// Shapes per product
export const productShapes = pgTable('product_shapes', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Rechthoek | Rond | Ovaal | ...
  slug: text('slug').notNull(),
  price_modifier: numeric('price_modifier', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  preview_image_url: text('preview_image_url'),
  sort_order: integer('sort_order').notNull().default(0),
})

// Option groups (Verlichting, Verwarming, etc.)
export const optionGroups = pgTable('option_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: optionGroupTypeEnum('type').notNull().default('single'),
  step: integer('step').notNull().default(1), // which configurator step (1-5)
  sort_order: integer('sort_order').notNull().default(0),
})

// Options within a group
export const options = pgTable('options', {
  id: uuid('id').primaryKey().defaultRandom(),
  group_id: uuid('group_id')
    .notNull()
    .references(() => optionGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  price_modifier: numeric('price_modifier', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  preview_image_url: text('preview_image_url'),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
})

// Saved configurations
export const configurations = pgTable('configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id),
  shape_id: uuid('shape_id').references(() => productShapes.id),
  name: text('name'), // user-given name
  width: integer('width'), // mm
  height: integer('height'), // mm
  selected_options: jsonb('selected_options').notNull().default('{}'), // { groupSlug: optionSlug[] }
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: configStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  configuration_id: uuid('configuration_id')
    .notNull()
    .references(() => configurations.id),
  user_id: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  order_number: text('order_number').notNull().unique(), // ORD-2024-0001
  quantity: integer('quantity').notNull().default(1),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  status: orderStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Changelogs (what's new)
export const changelogs = pgTable('changelogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  published_at: timestamp('published_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// RSS feed cache
export const rssCache = pgTable('rss_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  url: text('url').notNull().unique(),
  summary: text('summary'),
  image_url: text('image_url'),
  published_at: timestamp('published_at'),
  fetched_at: timestamp('fetched_at').notNull().defaultNow(),
})
