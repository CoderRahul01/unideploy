import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    clerk_id: text("clerk_id").unique(),
    username: text("username"),
    email: text("email"),
});

export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    name: text("name"), // Added name column
    status: text("status").default("CREATED"),
    last_active_at: timestamp("last_active_at").defaultNow(),
    daily_runtime_minutes: integer("daily_runtime_minutes").default(0),
    total_runtime_minutes: integer("total_runtime_minutes").default(0),
    last_reset_at: timestamp("last_reset_at").defaultNow(),
    is_locked: integer("is_locked").default(0),
    last_deployed: timestamp("last_deployed").defaultNow(),
    owner_id: integer("owner_id").references(() => users.id),
});

export const deployments = pgTable("deployments", {
    id: serial("id").primaryKey(),
    project_id: integer("project_id").references(() => projects.id),
    status: text("status"),
    image_tag: text("image_tag"),
    domain: text("domain"),
    logs: jsonb("logs"),
    created_at: timestamp("created_at").defaultNow(),
});
