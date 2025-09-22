import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        clerkId: v.string(),
        image: v.optional(v.string()),
        profileImage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
            .first();

        if (existingUser) return;

        return await ctx.db.insert("users", args);
    },
});

export const readUser = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            const userInfo = await ctx.db
                .query("users")
                .filter((q) =>
                    q.eq(q.field("clerkId"), args.clerkId))
                .first();
            return userInfo;
        } catch (error) {
            console.error("Error reading user:", error);
            throw error;
        }
    }
});

export const updateUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        clerkId: v.string(),
        image: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!existingUser) return;

        return await ctx.db.patch(existingUser._id, args);
    },
});

export const updateProfile = mutation({
    args: {
        clerkId: v.string(),
        name: v.optional(v.string()), // Le nom est maintenant optionnel
        phoneNumber: v.optional(v.string()), // Ajoutez le numéro de téléphone ici
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        // Créez un objet de mise à jour pour ne patcher que les champs fournis
        const updateData: Record<string, any> = {};
        if (args.name !== undefined) {
            updateData.name = args.name;
        }
        if (args.phoneNumber !== undefined) {
            updateData.phoneNumber = args.phoneNumber;
        }

        // Si aucun champ n'est fourni, ne faites rien
        if (Object.keys(updateData).length === 0) {
            return user;
        }

        // Appelez la fonction patch une seule fois avec les données à mettre à jour
        const updatedUser = await ctx.db.patch(user._id, updateData);

        return updatedUser;
    },
});

export const updateProfileImage = mutation({
    args: {
        clerkId: v.string(),
        image: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const updateUser = await ctx.db.patch(user._id, {
            image: args.image,
        });

        return updateUser;
    },
});

export const searchUsers = query({
    args: {
        searchTerm: v.string(),
        currentUserId: v.string(),
    },
    handler: async (ctx, args) => {
        if (!args.searchTerm) return [];

        const searchTermLower = args.searchTerm.toLowerCase();

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), args.currentUserId))
            .collect();

        return users
            .filter((user: any) => {
                const nameMatch = user?.name?.toLowerCase().includes(searchTermLower);

                const emailMatch = user?.email?.toLowerCase().includes(searchTermLower);

                return nameMatch || emailMatch;
            })
            .slice(0, 10);
    },
});