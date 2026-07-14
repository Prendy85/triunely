// src/features/partners/services/partnersService.js
import { supabase } from "../../../lib/supabase";

export const PARTNER_TYPES = [
  {
    value: "christian_business",
    label: "Christian Business",
    icon: "briefcase-outline",
  },
  {
    value: "creator",
    label: "Creator",
    icon: "videocam-outline",
  },
  {
    value: "ministry",
    label: "Ministry",
    icon: "sparkles-outline",
  },
  {
    value: "charity",
    label: "Charity",
    icon: "heart-outline",
  },
  {
    value: "church_supplier",
    label: "Church Supplier",
    icon: "business-outline",
  },
  {
    value: "counsellor_coach",
    label: "Counsellor / Coach",
    icon: "people-circle-outline",
  },
  {
    value: "venue_retreat_centre",
    label: "Venue / Retreat Centre",
    icon: "home-outline",
  },
  {
    value: "publisher",
    label: "Publisher",
    icon: "book-outline",
  },
  {
    value: "musician_worship_artist",
    label: "Musician / Worship Artist",
    icon: "musical-notes-outline",
  },
  {
    value: "speaker_teacher",
    label: "Speaker / Teacher",
    icon: "mic-outline",
  },
  {
    value: "course_provider",
    label: "Course Provider",
    icon: "school-outline",
  },
  {
    value: "school_training_provider",
    label: "School / Training Provider",
    icon: "library-outline",
  },
  {
    value: "event_provider",
    label: "Event Provider",
    icon: "calendar-outline",
  },
  {
    value: "other",
    label: "Other",
    icon: "apps-outline",
  },
];

export const PARTNER_POST_TYPES = [
  {
    value: "update",
    label: "Update",
    icon: "chatbubble-ellipses-outline",
  },
  {
    value: "offer",
    label: "Offer",
    icon: "pricetag-outline",
  },
  {
    value: "event_promo",
    label: "Event Promotion",
    icon: "calendar-outline",
  },
  {
    value: "course_promo",
    label: "Course Promotion",
    icon: "school-outline",
  },
  {
    value: "resource",
    label: "Resource",
    icon: "book-outline",
  },
  {
    value: "testimony",
    label: "Testimony",
    icon: "sparkles-outline",
  },
  {
    value: "launch",
    label: "Launch",
    icon: "rocket-outline",
  },
  {
    value: "mission_update",
    label: "Mission Update",
    icon: "earth-outline",
  },
];

export const PROMOTION_CAMPAIGN_TYPES = [
  {
    value: "boost_post",
    label: "Boost Post",
    icon: "trending-up-outline",
  },
  {
    value: "promote_profile",
    label: "Promote Profile",
    icon: "megaphone-outline",
  },
  {
    value: "promote_event",
    label: "Promote Event",
    icon: "calendar-outline",
  },
  {
    value: "promote_course",
    label: "Promote Course",
    icon: "school-outline",
  },
  {
    value: "promote_resource",
    label: "Promote Resource",
    icon: "book-outline",
  },
  {
    value: "promote_service",
    label: "Promote Service",
    icon: "briefcase-outline",
  },
  {
    value: "promote_charity_campaign",
    label: "Promote Charity Campaign",
    icon: "heart-outline",
  },
];

export const TARGET_ROLE_OPTIONS = [
  "pastors",
  "church_admins",
  "worship_leaders",
  "youth_leaders",
  "small_group_leaders",
  "parents",
  "families",
  "students",
  "men",
  "women",
  "christian_entrepreneurs",
  "creators",
  "volunteers",
  "ministry_leaders",
];

export const TARGET_INTEREST_OPTIONS = [
  "events",
  "courses",
  "bible_study",
  "worship_music",
  "books_resources",
  "counselling_coaching",
  "family_parenting",
  "youth_ministry",
  "missions_charity",
  "christian_business",
  "creative_media",
  "retreats_venues",
  "church_growth",
  "evangelism",
  "discipleship",
];

export const TARGET_AUDIENCE_TYPE_OPTIONS = [
  "local_believers",
  "national_believers",
  "churches",
  "church_leaders",
  "families",
  "creators",
  "entrepreneurs",
  "ministries",
  "charities",
  "event_attendees",
  "course_learners",
];

export const TARGET_LIFE_STAGE_OPTIONS = [
  "parents",
  "young_adults",
  "students",
  "families_with_children",
  "married_couples",
  "men",
  "women",
  "retired",
];

export const TARGET_CHURCH_CONTEXT_OPTIONS = [
  "church_members",
  "church_admins",
  "church_leaders",
  "worship_teams",
  "youth_ministry",
  "small_groups",
  "alpha_courses",
  "serving_teams",
  "outreach_teams",
];

export const TARGET_CONTENT_TYPE_OPTIONS = [
  "posts",
  "events",
  "courses",
  "resources",
  "offers",
  "videos",
  "testimonies",
  "charity_campaigns",
];

export function getPartnerTypeLabel(value) {
  return PARTNER_TYPES.find((item) => item.value === value)?.label || "Partner";
}

export function getPartnerTypeIcon(value) {
  return (
    PARTNER_TYPES.find((item) => item.value === value)?.icon || "apps-outline"
  );
}

export function createPartnerSlug(name) {
  const base = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 7);

  return `${base || "partner"}-${suffix}`;
}

export async function fetchPartnerProfiles({
  search = "",
  partnerType = null,
  category = null,
  onlyVerified = false,
  limit = 30,
} = {}) {
  try {
    let query = supabase
      .from("partner_profiles")
      .select(
        `
        id,
        owner_id,
        name,
        slug,
        partner_type,
        category,
        subcategory,
        short_description,
        about,
        logo_url,
        cover_image_url,
        website_url,
        location_text,
        service_area,
        city,
        region,
        country,
        is_online,
        serves_churches,
        serves_families,
        serves_creators,
        serves_businesses,
        verification_status,
        is_verified,
        status,
        created_at,
        updated_at
      `
      )
      .eq("status", "published")
      .order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const cleanSearch = String(search || "").trim();

    if (cleanSearch) {
      query = query.or(
        `name.ilike.%${cleanSearch}%,short_description.ilike.%${cleanSearch}%,about.ilike.%${cleanSearch}%,category.ilike.%${cleanSearch}%,location_text.ilike.%${cleanSearch}%`
      );
    }

    if (partnerType) {
      query = query.eq("partner_type", partnerType);
    }

    if (category) {
      query = query.ilike("category", `%${category}%`);
    }

    if (onlyVerified) {
      query = query.eq("is_verified", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      ok: true,
      partners: data || [],
    };
  } catch (error) {
    console.log("fetchPartnerProfiles error:", error);

    return {
      ok: false,
      partners: [],
      error,
    };
  }
}

export async function fetchMyPartnerProfiles({
  ownerId,
  limit = 50,
} = {}) {
  try {
    if (!ownerId) {
      return {
        ok: true,
        partners: [],
      };
    }

    const { data, error } = await supabase
      .from("partner_profiles")
      .select(
        `
        id,
        owner_id,
        name,
        slug,
        partner_type,
        category,
        subcategory,
        short_description,
        about,
        logo_url,
        cover_image_url,
        website_url,
        location_text,
        service_area,
        city,
        region,
        country,
        is_online,
        serves_churches,
        serves_families,
        serves_creators,
        serves_businesses,
        verification_status,
        is_verified,
        status,
        created_at,
        updated_at
      `
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      ok: true,
      partners: data || [],
    };
  } catch (error) {
    console.log("fetchMyPartnerProfiles error:", error);

    return {
      ok: false,
      partners: [],
      error,
    };
  }
}

export async function fetchPartnerProfileById(partnerProfileId) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    const { data, error } = await supabase
      .from("partner_profiles")
      .select(
        `
        id,
        owner_id,
        name,
        slug,
        partner_type,
        category,
        subcategory,
        short_description,
        about,
        logo_url,
        cover_image_url,
        intro_video_url,
        website_url,
        contact_email,
        phone,
        social_links,
        location_text,
        service_area,
        country,
        city,
        region,
        postcode_prefix,
        is_online,
        serves_churches,
        serves_families,
        serves_creators,
        serves_businesses,
        verification_status,
        is_verified,
        status,
        created_at,
        updated_at
      `
      )
      .eq("id", partnerProfileId)
      .single();

    if (error) throw error;

    return {
      ok: true,
      partner: data,
    };
  } catch (error) {
    console.log("fetchPartnerProfileById error:", error);

    return {
      ok: false,
      partner: null,
      error,
    };
  }
}

export async function createPartnerProfile({
  ownerId,
  name,
  partnerType,
  category = "",
  subcategory = "",
  shortDescription = "",
  about = "",
  websiteUrl = "",
  contactEmail = "",
  phone = "",
  socialLinks = {},
  locationText = "",
  serviceArea = "",
  country = "United Kingdom",
  city = "",
  region = "",
  postcodePrefix = "",
  isOnline = false,
  servesChurches = false,
  servesFamilies = false,
  servesCreators = false,
  servesBusinesses = false,
  logoUrl = "",
  coverImageUrl = "",
} = {}) {
  try {
    if (!ownerId) throw new Error("Missing owner id");

    if (!String(name || "").trim()) {
      throw new Error("Partner name is required");
    }

    if (!partnerType) {
      throw new Error("Partner type is required");
    }

    const cleanName = String(name || "").trim();

    const payload = {
      owner_id: ownerId,
      name: cleanName,
      slug: createPartnerSlug(cleanName),
      partner_type: partnerType,
      category: String(category || "").trim() || null,
      subcategory: String(subcategory || "").trim() || null,
      short_description: String(shortDescription || "").trim() || null,
      about: String(about || "").trim() || null,
      website_url: String(websiteUrl || "").trim() || null,
      contact_email: String(contactEmail || "").trim() || null,
      phone: String(phone || "").trim() || null,
      social_links:
        socialLinks &&
        typeof socialLinks === "object" &&
        !Array.isArray(socialLinks)
          ? socialLinks
          : {},
      location_text: String(locationText || "").trim() || null,
      service_area: String(serviceArea || "").trim() || null,
      country:
        String(country || "United Kingdom").trim() || "United Kingdom",
      city: String(city || "").trim() || null,
      region: String(region || "").trim() || null,
      postcode_prefix: String(postcodePrefix || "").trim() || null,
      is_online: Boolean(isOnline),
      serves_churches: Boolean(servesChurches),
      serves_families: Boolean(servesFamilies),
      serves_creators: Boolean(servesCreators),
      serves_businesses: Boolean(servesBusinesses),
      verification_status: "unverified",
      is_verified: false,
      logo_url: String(logoUrl || "").trim() || null,
      cover_image_url: String(coverImageUrl || "").trim() || null,
      status: "published",
    };

    const { data, error } = await supabase
      .from("partner_profiles")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    const { error: adminError } = await supabase
      .from("partner_profile_admins")
      .insert({
        partner_profile_id: data.id,
        user_id: ownerId,
        role: "owner",
      });

    if (adminError) {
      console.log(
        "createPartnerProfile owner admin insert error:",
        adminError
      );
    }

    return {
      ok: true,
      partner: data,
    };
  } catch (error) {
    console.log("createPartnerProfile error:", error);

    return {
      ok: false,
      partner: null,
      error,
    };
  }
}

export async function updatePartnerProfile({
  partnerProfileId,
  name,
  partnerType,
  category,
  subcategory,
  shortDescription,
  about,
  websiteUrl,
  contactEmail,
  phone,
  socialLinks,
  locationText,
  serviceArea,
  country,
  city,
  region,
  postcodePrefix,
  isOnline,
  servesChurches,
  servesFamilies,
  servesCreators,
  servesBusinesses,
  logoUrl,
  coverImageUrl,
  status,
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    const payload = {};

    if (name !== undefined) {
      payload.name = String(name || "").trim();
    }

    if (partnerType !== undefined) {
      payload.partner_type = partnerType;
    }

    if (category !== undefined) {
      payload.category = String(category || "").trim() || null;
    }

    if (subcategory !== undefined) {
      payload.subcategory = String(subcategory || "").trim() || null;
    }

    if (shortDescription !== undefined) {
      payload.short_description =
        String(shortDescription || "").trim() || null;
    }

    if (about !== undefined) {
      payload.about = String(about || "").trim() || null;
    }

    if (websiteUrl !== undefined) {
      payload.website_url = String(websiteUrl || "").trim() || null;
    }

    if (contactEmail !== undefined) {
      payload.contact_email =
        String(contactEmail || "").trim() || null;
    }

    if (phone !== undefined) {
      payload.phone = String(phone || "").trim() || null;
    }

    if (socialLinks !== undefined) {
      payload.social_links =
        socialLinks &&
        typeof socialLinks === "object" &&
        !Array.isArray(socialLinks)
          ? socialLinks
          : {};
    }

    if (locationText !== undefined) {
      payload.location_text =
        String(locationText || "").trim() || null;
    }

    if (serviceArea !== undefined) {
      payload.service_area =
        String(serviceArea || "").trim() || null;
    }

    if (country !== undefined) {
      payload.country =
        String(country || "United Kingdom").trim() || "United Kingdom";
    }

    if (city !== undefined) {
      payload.city = String(city || "").trim() || null;
    }

    if (region !== undefined) {
      payload.region = String(region || "").trim() || null;
    }

    if (postcodePrefix !== undefined) {
      payload.postcode_prefix =
        String(postcodePrefix || "").trim() || null;
    }

    if (isOnline !== undefined) {
      payload.is_online = Boolean(isOnline);
    }

    if (servesChurches !== undefined) {
      payload.serves_churches = Boolean(servesChurches);
    }

    if (servesFamilies !== undefined) {
      payload.serves_families = Boolean(servesFamilies);
    }

    if (servesCreators !== undefined) {
      payload.serves_creators = Boolean(servesCreators);
    }

    if (servesBusinesses !== undefined) {
      payload.serves_businesses = Boolean(servesBusinesses);
    }

    if (logoUrl !== undefined) {
      payload.logo_url = String(logoUrl || "").trim() || null;
    }

    if (coverImageUrl !== undefined) {
      payload.cover_image_url =
        String(coverImageUrl || "").trim() || null;
    }

    if (status !== undefined) {
      payload.status = status;
    }

    const { data, error } = await supabase
      .from("partner_profiles")
      .update(payload)
      .eq("id", partnerProfileId)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      partner: data,
    };
  } catch (error) {
    console.log("updatePartnerProfile error:", error);

    return {
      ok: false,
      partner: null,
      error,
    };
  }
}

export async function fetchPartnerPosts({
  partnerProfileId,
  limit = 30,
} = {}) {
  try {
    if (!partnerProfileId) {
      return {
        ok: true,
        posts: [],
      };
    }

    const { data, error } = await supabase
      .from("partner_posts")
      .select(
        `
        id,
        partner_profile_id,
        author_id,
        title,
        content,
        media_url,
        media_type,
        link_url,
        link_title,
        link_description,
        link_image,
        post_type,
        status,
        created_at,
        updated_at
      `
      )
      .eq("partner_profile_id", partnerProfileId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      ok: true,
      posts: data || [],
    };
  } catch (error) {
    console.log("fetchPartnerPosts error:", error);

    return {
      ok: false,
      posts: [],
      error,
    };
  }
}

export async function fetchPartnerPostById(partnerPostId) {
  try {
    if (!partnerPostId) {
      throw new Error("Missing partner post id");
    }

    const { data, error } = await supabase
      .from("partner_posts")
      .select(
        `
        id,
        partner_profile_id,
        author_id,
        title,
        content,
        media_url,
        media_type,
        link_url,
        link_title,
        link_description,
        link_image,
        post_type,
        status,
        created_at,
        updated_at
      `
      )
      .eq("id", partnerPostId)
      .single();

    if (error) throw error;

    return {
      ok: true,
      post: data,
    };
  } catch (error) {
    console.log("fetchPartnerPostById error:", error);

    return {
      ok: false,
      post: null,
      error,
    };
  }
}

export async function createPartnerPost({
  partnerProfileId,
  authorId,
  title = "",
  content = "",
  postType = "update",
  mediaUrl = "",
  mediaType = "",
  linkUrl = "",
  linkTitle = "",
  linkDescription = "",
  linkImage = "",
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    if (!authorId) {
      throw new Error("Missing author id");
    }

    if (
      !String(content || "").trim() &&
      !String(title || "").trim()
    ) {
      throw new Error("Post needs a title or content");
    }

    const payload = {
      partner_profile_id: partnerProfileId,
      author_id: authorId,
      title: String(title || "").trim() || null,
      content: String(content || "").trim() || null,
      post_type: postType || "update",
      media_url: String(mediaUrl || "").trim() || null,
      media_type: String(mediaType || "").trim() || null,
      link_url: String(linkUrl || "").trim() || null,
      link_title: String(linkTitle || "").trim() || null,
      link_description:
        String(linkDescription || "").trim() || null,
      link_image: String(linkImage || "").trim() || null,
      status: "published",
    };

    const { data, error } = await supabase
      .from("partner_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      post: data,
    };
  } catch (error) {
    console.log("createPartnerPost error:", error);

    return {
      ok: false,
      post: null,
      error,
    };
  }
}

export async function updatePartnerPost({
  partnerPostId,
  title = "",
  content = "",
  postType = "update",
  mediaUrl = "",
  mediaType = "",
  linkUrl = "",
  linkTitle = "",
  linkDescription = "",
  linkImage = "",
  status = "published",
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error("Missing partner post id");
    }

    if (
      !String(content || "").trim() &&
      !String(title || "").trim()
    ) {
      throw new Error("Post needs a title or content");
    }

    const payload = {
      title: String(title || "").trim() || null,
      content: String(content || "").trim() || null,
      post_type: postType || "update",
      media_url: String(mediaUrl || "").trim() || null,
      media_type: String(mediaType || "").trim() || null,
      link_url: String(linkUrl || "").trim() || null,
      link_title: String(linkTitle || "").trim() || null,
      link_description:
        String(linkDescription || "").trim() || null,
      link_image: String(linkImage || "").trim() || null,
      status,
    };

    const { data, error } = await supabase
      .from("partner_posts")
      .update(payload)
      .eq("id", partnerPostId)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      post: data,
    };
  } catch (error) {
    console.log("updatePartnerPost error:", error);

    return {
      ok: false,
      post: null,
      error,
    };
  }
}

export async function createPromotionCampaign({
  partnerProfileId,
  partnerPostId = null,
  ownerId,
  campaignType = "boost_post",
  title = "",
  objective = "",
  budgetPence = 0,
  currency = "GBP",
  startsAt = null,
  endsAt = null,
  targetLocations = [],
  targetCategories = [],
  targetRoles = [],
  targetInterests = [],
  targetLifeStages = [],
  targetAudienceTypes = [],
  targetChurchContexts = [],
  targetContentTypes = [],
  localRadiusMiles = null,
  national = false,
  churchFacing = false,
  familyFacing = false,
  creatorFacing = false,
  entrepreneurFacing = false,
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    if (!ownerId) {
      throw new Error("Missing owner id");
    }

    const payload = {
      partner_profile_id: partnerProfileId,
      partner_post_id: partnerPostId,
      owner_id: ownerId,
      campaign_type: campaignType,
      title: String(title || "").trim() || null,
      objective: String(objective || "").trim() || null,
      budget_pence: Number.isFinite(Number(budgetPence))
        ? Number(budgetPence)
        : 0,
      currency: currency || "GBP",
      starts_at: startsAt,
      ends_at: endsAt,
      status: "draft",
      approval_status: "pending",
      target_locations: Array.isArray(targetLocations)
        ? targetLocations
        : [],
      target_categories: Array.isArray(targetCategories)
        ? targetCategories
        : [],
      target_roles: Array.isArray(targetRoles)
        ? targetRoles
        : [],
      target_interests: Array.isArray(targetInterests)
        ? targetInterests
        : [],
      target_life_stages: Array.isArray(targetLifeStages)
        ? targetLifeStages
        : [],
      target_audience_types: Array.isArray(targetAudienceTypes)
        ? targetAudienceTypes
        : [],
      target_church_contexts: Array.isArray(targetChurchContexts)
        ? targetChurchContexts
        : [],
      target_content_types: Array.isArray(targetContentTypes)
        ? targetContentTypes
        : [],
      local_radius_miles:
        localRadiusMiles === null || localRadiusMiles === undefined
          ? null
          : Number(localRadiusMiles),
      national: Boolean(national),
      church_facing: Boolean(churchFacing),
      family_facing: Boolean(familyFacing),
      creator_facing: Boolean(creatorFacing),
      entrepreneur_facing: Boolean(entrepreneurFacing),
    };

    const { data, error } = await supabase
      .from("partner_promotion_campaigns")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      campaign: data,
    };
  } catch (error) {
    console.log("createPromotionCampaign error:", error);

    return {
      ok: false,
      campaign: null,
      error,
    };
  }
}

export async function fetchPartnerGalleryItems({
  partnerProfileId,
  includeArchived = false,
  limit = 100,
} = {}) {
  try {
    if (!partnerProfileId) {
      return {
        ok: true,
        items: [],
      };
    }

    let query = supabase
      .from("partner_profile_gallery_items")
      .select(
        `
        id,
        partner_profile_id,
        uploaded_by,
        media_url,
        media_type,
        thumbnail_url,
        caption,
        alt_text,
        sort_order,
        status,
        created_at,
        updated_at
      `
      )
      .eq("partner_profile_id", partnerProfileId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (!includeArchived) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      ok: true,
      items: data || [],
    };
  } catch (error) {
    console.log("fetchPartnerGalleryItems error:", error);

    return {
      ok: false,
      items: [],
      error,
    };
  }
}

export async function createPartnerGalleryItem({
  partnerProfileId,
  uploadedBy,
  mediaUrl,
  mediaType = "image",
  thumbnailUrl = "",
  caption = "",
  altText = "",
  sortOrder = 0,
  status = "published",
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    if (!uploadedBy) {
      throw new Error("Missing uploader id");
    }

    const cleanMediaUrl = String(mediaUrl || "").trim();

    if (!cleanMediaUrl) {
      throw new Error("Gallery media URL is required");
    }

    const payload = {
      partner_profile_id: partnerProfileId,
      uploaded_by: uploadedBy,
      media_url: cleanMediaUrl,
      media_type: mediaType === "video" ? "video" : "image",
      thumbnail_url:
        String(thumbnailUrl || "").trim() || null,
      caption: String(caption || "").trim() || null,
      alt_text: String(altText || "").trim() || null,
      sort_order: Number.isFinite(Number(sortOrder))
        ? Number(sortOrder)
        : 0,
      status: ["draft", "published", "archived"].includes(status)
        ? status
        : "published",
    };

    const { data, error } = await supabase
      .from("partner_profile_gallery_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      item: data,
    };
  } catch (error) {
    console.log("createPartnerGalleryItem error:", error);

    return {
      ok: false,
      item: null,
      error,
    };
  }
}

export async function updatePartnerGalleryItem({
  galleryItemId,
  caption,
  altText,
  sortOrder,
  thumbnailUrl,
  status,
} = {}) {
  try {
    if (!galleryItemId) {
      throw new Error("Missing gallery item id");
    }

    const payload = {};

    if (caption !== undefined) {
      payload.caption =
        String(caption || "").trim() || null;
    }

    if (altText !== undefined) {
      payload.alt_text =
        String(altText || "").trim() || null;
    }

    if (sortOrder !== undefined) {
      payload.sort_order = Number.isFinite(Number(sortOrder))
        ? Number(sortOrder)
        : 0;
    }

    if (thumbnailUrl !== undefined) {
      payload.thumbnail_url =
        String(thumbnailUrl || "").trim() || null;
    }

    if (status !== undefined) {
      payload.status = ["draft", "published", "archived"].includes(status)
        ? status
        : "published";
    }

    const { data, error } = await supabase
      .from("partner_profile_gallery_items")
      .update(payload)
      .eq("id", galleryItemId)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ok: true,
      item: data,
    };
  } catch (error) {
    console.log("updatePartnerGalleryItem error:", error);

    return {
      ok: false,
      item: null,
      error,
    };
  }
}

export async function deletePartnerGalleryItem(galleryItemId) {
  try {
    if (!galleryItemId) {
      throw new Error("Missing gallery item id");
    }

    const { error } = await supabase
      .from("partner_profile_gallery_items")
      .delete()
      .eq("id", galleryItemId);

    if (error) throw error;

    return {
      ok: true,
    };
  } catch (error) {
    console.log("deletePartnerGalleryItem error:", error);

    return {
      ok: false,
      error,
    };
  }
}

export async function reorderPartnerGalleryItems({
  partnerProfileId,
  orderedItemIds = [],
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error("Missing partner profile id");
    }

    const ids = Array.isArray(orderedItemIds)
      ? orderedItemIds.filter(Boolean)
      : [];

    if (ids.length === 0) {
      return {
        ok: true,
      };
    }

    for (let index = 0; index < ids.length; index += 1) {
      const galleryItemId = ids[index];

      const { error } = await supabase
        .from("partner_profile_gallery_items")
        .update({
          sort_order: index,
        })
        .eq("id", galleryItemId)
        .eq("partner_profile_id", partnerProfileId);

      if (error) throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log("reorderPartnerGalleryItems error:", error);

    return {
      ok: false,
      error,
    };
  }
}
// ============================================================
// PARTNER GALLERY INTERACTIONS
// Reactions and comments for individual gallery items
// ============================================================

export const PARTNER_GALLERY_REACTION_TYPES = [
  {
    value: "like",
    label: "Like",
    emoji: "👍",
  },
  {
    value: "love",
    label: "Love",
    emoji: "❤️",
  },
  {
    value: "laugh",
    label: "Laugh",
    emoji: "😂",
  },
  {
    value: "sad",
    label: "Sad",
    emoji: "😢",
  },
  {
    value: "angry",
    label: "Angry",
    emoji: "😡",
  },
  {
    value: "pray",
    label: "Pray",
    emoji: "🙏",
  },
];

export async function fetchPartnerGalleryInteractionSummary({
  galleryItemId,
  currentUserId = null,
} = {}) {
  const emptySummary = {
    likeCount: 0,
    loveCount: 0,
    laughCount: 0,
    sadCount: 0,
    angryCount: 0,
    prayCount: 0,
    totalReactions: 0,
    commentCount: 0,
    currentUserReaction: null,
  };

  try {
    if (!galleryItemId) {
      return {
        ok: true,
        summary: emptySummary,
      };
    }

    const [
      reactionResult,
      commentResult,
    ] = await Promise.all([
      supabase
        .from(
          "partner_gallery_reactions"
        )
        .select(
          `
          user_id,
          reaction_type
        `
        )
        .eq(
          "gallery_item_id",
          galleryItemId
        ),

      supabase
        .from(
          "partner_gallery_comments"
        )
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "gallery_item_id",
          galleryItemId
        )
        .eq(
          "status",
          "published"
        ),
    ]);

    if (reactionResult.error) {
      throw reactionResult.error;
    }

    if (commentResult.error) {
      throw commentResult.error;
    }

    const reactions =
      reactionResult.data || [];

    const counts = reactions.reduce(
      (result, reaction) => {
        const reactionType =
          reaction?.reaction_type;

        if (
          reactionType === "like"
        ) {
          result.likeCount += 1;
        }

        if (
          reactionType === "love"
        ) {
          result.loveCount += 1;
        }

        if (
          reactionType === "laugh"
        ) {
          result.laughCount += 1;
        }

        if (
          reactionType === "sad"
        ) {
          result.sadCount += 1;
        }

        if (
          reactionType === "angry"
        ) {
          result.angryCount += 1;
        }

        if (
          reactionType === "pray"
        ) {
          result.prayCount += 1;
        }

        return result;
      },
      {
        likeCount: 0,
        loveCount: 0,
        laughCount: 0,
        sadCount: 0,
        angryCount: 0,
        prayCount: 0,
      }
    );

    const currentUserReaction =
      currentUserId
        ? reactions.find(
            (reaction) =>
              reaction.user_id ===
              currentUserId
          )?.reaction_type || null
        : null;

    const totalReactions =
      counts.likeCount +
      counts.loveCount +
      counts.laughCount +
      counts.sadCount +
      counts.angryCount +
      counts.prayCount;

    return {
      ok: true,
      summary: {
        ...counts,
        totalReactions,
        commentCount:
          commentResult.count || 0,
        currentUserReaction,
      },
    };
  } catch (error) {
    console.log(
      "fetchPartnerGalleryInteractionSummary error:",
      error
    );

    return {
      ok: false,
      summary: emptySummary,
      error,
    };
  }
}

export async function setPartnerGalleryReaction({
  galleryItemId,
  userId,
  reactionType,
} = {}) {
  try {
    if (!galleryItemId) {
      throw new Error(
        "Missing gallery item id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing reaction user id"
      );
    }

    const cleanReactionType =
      String(
        reactionType || ""
      )
        .trim()
        .toLowerCase();

    const allowedReactionTypes =
      PARTNER_GALLERY_REACTION_TYPES.map(
        (reaction) =>
          reaction.value
      );

    if (
      !allowedReactionTypes.includes(
        cleanReactionType
      )
    ) {
      throw new Error(
        "Invalid gallery reaction type"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_gallery_reactions"
        )
        .upsert(
          {
            gallery_item_id:
              galleryItemId,
            user_id: userId,
            reaction_type:
              cleanReactionType,
          },
          {
            onConflict:
              "gallery_item_id,user_id",
          }
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      reaction: data,
    };
  } catch (error) {
    console.log(
      "setPartnerGalleryReaction error:",
      error
    );

    return {
      ok: false,
      reaction: null,
      error,
    };
  }
}

export async function removePartnerGalleryReaction({
  galleryItemId,
  userId,
} = {}) {
  try {
    if (!galleryItemId) {
      throw new Error(
        "Missing gallery item id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing reaction user id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_gallery_reactions"
        )
        .delete()
        .eq(
          "gallery_item_id",
          galleryItemId
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "removePartnerGalleryReaction error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}

export async function fetchPartnerGalleryComments({
  galleryItemId,
  limit = 100,
} = {}) {
  try {
    if (!galleryItemId) {
      return {
        ok: true,
        comments: [],
      };
    }

    const {
      data: commentRows,
      error: commentsError,
    } = await supabase
      .from(
        "partner_gallery_comments"
      )
      .select(
        `
        id,
        gallery_item_id,
        user_id,
        parent_comment_id,
        content,
        status,
        created_at,
        updated_at
      `
      )
      .eq(
        "gallery_item_id",
        galleryItemId
      )
      .eq("status", "published")
      .order("created_at", {
        ascending: true,
      })
      .limit(limit);

    if (commentsError) {
      throw commentsError;
    }

    const comments =
      commentRows || [];

    const userIds = [
      ...new Set(
        comments
          .map(
            (comment) =>
              comment.user_id
          )
          .filter(Boolean)
      ),
    ];

    let profilesById = {};

    if (userIds.length > 0) {
      const {
        data: profileRows,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          avatar_url
        `
        )
        .in("id", userIds);

      if (profilesError) {
        console.log(
          "fetchPartnerGalleryComments profile lookup error:",
          profilesError
        );
      } else {
        profilesById = (
          profileRows || []
        ).reduce(
          (result, profile) => {
            result[profile.id] =
              profile;

            return result;
          },
          {}
        );
      }
    }

    return {
      ok: true,
      comments: comments.map(
        (comment) => ({
          ...comment,
          profile:
            profilesById[
              comment.user_id
            ] || null,
        })
      ),
    };
  } catch (error) {
    console.log(
      "fetchPartnerGalleryComments error:",
      error
    );

    return {
      ok: false,
      comments: [],
      error,
    };
  }
}

export async function createPartnerGalleryComment({
  galleryItemId,
  userId,
  content,
  parentCommentId = null,
} = {}) {
  try {
    if (!galleryItemId) {
      throw new Error(
        "Missing gallery item id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing comment user id"
      );
    }

    const cleanContent =
      String(content || "").trim();

    if (!cleanContent) {
      throw new Error(
        "Comment cannot be empty"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_gallery_comments"
        )
        .insert({
          gallery_item_id:
            galleryItemId,
          user_id: userId,
          parent_comment_id:
            parentCommentId || null,
          content: cleanContent,
          status: "published",
        })
        .select(
          `
          id,
          gallery_item_id,
          user_id,
          parent_comment_id,
          content,
          status,
          created_at,
          updated_at
        `
        )
        .single();

    if (error) {
      throw error;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
        id,
        display_name,
        avatar_url
      `
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.log(
        "createPartnerGalleryComment profile lookup error:",
        profileError
      );
    }

    return {
      ok: true,
      comment: {
        ...data,
        profile: profile || null,
      },
    };
  } catch (error) {
    console.log(
      "createPartnerGalleryComment error:",
      error
    );

    return {
      ok: false,
      comment: null,
      error,
    };
  }
}

export async function updatePartnerGalleryComment({
  commentId,
  content,
} = {}) {
  try {
    if (!commentId) {
      throw new Error(
        "Missing gallery comment id"
      );
    }

    const cleanContent =
      String(content || "").trim();

    if (!cleanContent) {
      throw new Error(
        "Comment cannot be empty"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_gallery_comments"
        )
        .update({
          content: cleanContent,
        })
        .eq("id", commentId)
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      comment: data,
    };
  } catch (error) {
    console.log(
      "updatePartnerGalleryComment error:",
      error
    );

    return {
      ok: false,
      comment: null,
      error,
    };
  }
}

export async function deletePartnerGalleryComment(
  commentId
) {
  try {
    if (!commentId) {
      throw new Error(
        "Missing gallery comment id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_gallery_comments"
        )
        .delete()
        .eq("id", commentId);

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "deletePartnerGalleryComment error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}
// ============================================================
// PARTNER POST MEDIA
// Multiple media items linked to Partner Posts and Gallery
// ============================================================

export async function fetchPartnerPostMedia({
  partnerPostId,
} = {}) {
  try {
    if (!partnerPostId) {
      return {
        ok: true,
        media: [],
      };
    }

    const { data, error } =
      await supabase
        .from("partner_post_media")
        .select(
          `
          id,
          partner_post_id,
          partner_profile_id,
          uploaded_by,
          media_url,
          media_type,
          thumbnail_url,
          sort_order,
          created_at,
          updated_at
        `
        )
        .eq(
          "partner_post_id",
          partnerPostId
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return {
      ok: true,
      media: data || [],
    };
  } catch (error) {
    console.log(
      "fetchPartnerPostMedia error:",
      error
    );

    return {
      ok: false,
      media: [],
      error,
    };
  }
}

export async function createPartnerPostMediaItem({
  partnerPostId,
  partnerProfileId,
  uploadedBy,
  mediaUrl,
  mediaType = "image",
  thumbnailUrl = "",
  sortOrder = 0,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing partner post id"
      );
    }

    if (!partnerProfileId) {
      throw new Error(
        "Missing partner profile id"
      );
    }

    if (!uploadedBy) {
      throw new Error(
        "Missing uploader id"
      );
    }

    const cleanMediaUrl =
      String(
        mediaUrl || ""
      ).trim();

    if (!cleanMediaUrl) {
      throw new Error(
        "Partner Post media URL is required"
      );
    }

    const cleanMediaType =
      String(
        mediaType || ""
      ).toLowerCase();

    const payload = {
      partner_post_id:
        partnerPostId,
      partner_profile_id:
        partnerProfileId,
      uploaded_by:
        uploadedBy,
      media_url:
        cleanMediaUrl,
      media_type:
        cleanMediaType.includes(
          "video"
        )
          ? "video"
          : "image",
      thumbnail_url:
        String(
          thumbnailUrl || ""
        ).trim() || null,
      sort_order:
        Number.isFinite(
          Number(sortOrder)
        )
          ? Number(sortOrder)
          : 0,
    };

    const { data, error } =
      await supabase
        .from("partner_post_media")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      mediaItem: data,
    };
  } catch (error) {
    console.log(
      "createPartnerPostMediaItem error:",
      error
    );

    return {
      ok: false,
      mediaItem: null,
      error,
    };
  }
}

export async function createPartnerPostMediaWithGallery({
  partnerPostId,
  partnerProfileId,
  uploadedBy,
  uploadedMedia = [],
  title = "",
  content = "",
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing partner post id"
      );
    }

    if (!partnerProfileId) {
      throw new Error(
        "Missing partner profile id"
      );
    }

    if (!uploadedBy) {
      throw new Error(
        "Missing uploader id"
      );
    }

    const safeMedia =
      Array.isArray(uploadedMedia)
        ? uploadedMedia.filter(
            (item) =>
              String(
                item?.mediaUrl || ""
              ).trim()
          )
        : [];

    if (safeMedia.length === 0) {
      return {
        ok: true,
        media: [],
        galleryItems: [],
      };
    }

    const galleryCaption = [
      String(title || "").trim(),
      String(content || "").trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const createdMedia = [];
    const createdGalleryItems = [];

    const {
      data: firstGalleryItem,
      error: galleryOrderError,
    } = await supabase
      .from(
        "partner_profile_gallery_items"
      )
      .select("sort_order")
      .eq(
        "partner_profile_id",
        partnerProfileId
      )
      .order("sort_order", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (galleryOrderError) {
      throw galleryOrderError;
    }

    const currentLowestSortOrder =
      Number.isFinite(
        Number(
          firstGalleryItem?.sort_order
        )
      )
        ? Number(
            firstGalleryItem.sort_order
          )
        : 0;

    const newBatchStartOrder =
      currentLowestSortOrder -
      safeMedia.length;

    for (
      let index = 0;
      index < safeMedia.length;
      index += 1
    ) {
      const media =
        safeMedia[index];

      const mediaResult =
        await createPartnerPostMediaItem({
          partnerPostId,
          partnerProfileId,
          uploadedBy,
          mediaUrl:
            media.mediaUrl,
          mediaType:
            media.mediaType,
          thumbnailUrl:
            media.thumbnailUrl ||
            "",
                  sort_order:
          newBatchStartOrder + index,
        });

      if (
        !mediaResult.ok ||
        !mediaResult.mediaItem
      ) {
        throw (
          mediaResult.error ||
          new Error(
            "Partner Post media could not be created"
          )
        );
      }

      createdMedia.push(
        mediaResult.mediaItem
      );

      const galleryPayload = {
        partner_profile_id:
          partnerProfileId,
        uploaded_by:
          uploadedBy,
        media_url:
          mediaResult.mediaItem
            .media_url,
        media_type:
          mediaResult.mediaItem
            .media_type,
        thumbnail_url:
          mediaResult.mediaItem
            .thumbnail_url,
        caption:
          index === 0
            ? galleryCaption || null
            : null,
        alt_text:
          index === 0
            ? String(
                title || ""
              ).trim() || null
            : null,
        sort_order: index,
        status: "published",
        source_partner_post_id:
          partnerPostId,
        source_partner_post_media_id:
          mediaResult.mediaItem.id,
      };

      const {
        data: galleryItem,
        error: galleryError,
      } = await supabase
        .from(
          "partner_profile_gallery_items"
        )
        .insert(galleryPayload)
        .select("*")
        .single();

      if (galleryError) {
        throw galleryError;
      }

      createdGalleryItems.push(
        galleryItem
      );
    }

    return {
      ok: true,
      media: createdMedia,
      galleryItems:
        createdGalleryItems,
    };
  } catch (error) {
    console.log(
      "createPartnerPostMediaWithGallery error:",
      error
    );

    return {
      ok: false,
      media: [],
      galleryItems: [],
      error,
    };
  }
}

export async function deletePartnerPostMediaItem({
  partnerPostMediaId,
} = {}) {
  try {
    if (!partnerPostMediaId) {
      throw new Error(
        "Missing Partner Post media id"
      );
    }

    const { error } =
      await supabase
        .from("partner_post_media")
        .delete()
        .eq(
          "id",
          partnerPostMediaId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "deletePartnerPostMediaItem error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}

export async function fetchGalleryItemsForPartnerPost({
  partnerPostId,
} = {}) {
  try {
    if (!partnerPostId) {
      return {
        ok: true,
        galleryItems: [],
      };
    }

    const { data, error } =
      await supabase
        .from(
          "partner_profile_gallery_items"
        )
        .select(
          `
          id,
          partner_profile_id,
          uploaded_by,
          media_url,
          media_type,
          thumbnail_url,
          caption,
          alt_text,
          sort_order,
          status,
          source_partner_post_id,
          source_partner_post_media_id,
          created_at,
          updated_at
        `
        )
        .eq(
          "source_partner_post_id",
          partnerPostId
        )
        .order("sort_order", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return {
      ok: true,
      galleryItems: data || [],
    };
  } catch (error) {
    console.log(
      "fetchGalleryItemsForPartnerPost error:",
      error
    );

    return {
      ok: false,
      galleryItems: [],
      error,
    };
  }
}

export async function detachGalleryItemsFromPartnerPost({
  partnerPostId,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing partner post id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_profile_gallery_items"
        )
        .update({
          source_partner_post_id:
            null,
          source_partner_post_media_id:
            null,
        })
        .eq(
          "source_partner_post_id",
          partnerPostId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "detachGalleryItemsFromPartnerPost error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}

export async function deleteGalleryItemsForPartnerPost({
  partnerPostId,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing partner post id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_profile_gallery_items"
        )
        .delete()
        .eq(
          "source_partner_post_id",
          partnerPostId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "deleteGalleryItemsForPartnerPost error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}
// ============================================================
// PARTNER POST INTERACTIONS
// Reactions and comments for individual Partner Posts
// ============================================================

export const PARTNER_POST_REACTION_TYPES = [
  {
    value: "like",
    label: "Like",
    emoji: "👍",
  },
  {
    value: "love",
    label: "Love",
    emoji: "❤️",
  },
  {
    value: "laugh",
    label: "Laugh",
    emoji: "😂",
  },
  {
    value: "sad",
    label: "Sad",
    emoji: "😢",
  },
  {
    value: "angry",
    label: "Angry",
    emoji: "😡",
  },
  {
    value: "pray",
    label: "Pray",
    emoji: "🙏",
  },
];

export async function fetchPartnerPostInteractionSummary({
  partnerPostId,
  currentUserId = null,
} = {}) {
  const emptySummary = {
    likeCount: 0,
    loveCount: 0,
    laughCount: 0,
    sadCount: 0,
    angryCount: 0,
    prayCount: 0,
    totalReactions: 0,
    commentCount: 0,
    currentUserReaction: null,
  };

  try {
    if (!partnerPostId) {
      return {
        ok: true,
        summary: emptySummary,
      };
    }

    const [
      reactionResult,
      commentResult,
    ] = await Promise.all([
      supabase
        .from(
          "partner_post_reactions"
        )
        .select(
          `
          user_id,
          reaction_type
        `
        )
        .eq(
          "partner_post_id",
          partnerPostId
        ),

      supabase
        .from(
          "partner_post_comments"
        )
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "partner_post_id",
          partnerPostId
        )
        .eq(
          "status",
          "published"
        ),
    ]);

    if (reactionResult.error) {
      throw reactionResult.error;
    }

    if (commentResult.error) {
      throw commentResult.error;
    }

    const reactions =
      reactionResult.data || [];

    const counts = reactions.reduce(
      (result, reaction) => {
        const reactionType =
          reaction?.reaction_type;

        if (
          reactionType === "like"
        ) {
          result.likeCount += 1;
        }

        if (
          reactionType === "love"
        ) {
          result.loveCount += 1;
        }

        if (
          reactionType === "laugh"
        ) {
          result.laughCount += 1;
        }

        if (
          reactionType === "sad"
        ) {
          result.sadCount += 1;
        }

        if (
          reactionType === "angry"
        ) {
          result.angryCount += 1;
        }

        if (
          reactionType === "pray"
        ) {
          result.prayCount += 1;
        }

        return result;
      },
      {
        likeCount: 0,
        loveCount: 0,
        laughCount: 0,
        sadCount: 0,
        angryCount: 0,
        prayCount: 0,
      }
    );

    const totalReactions =
      counts.likeCount +
      counts.loveCount +
      counts.laughCount +
      counts.sadCount +
      counts.angryCount +
      counts.prayCount;

    const currentUserReaction =
      currentUserId
        ? reactions.find(
            (reaction) =>
              reaction.user_id ===
              currentUserId
          )?.reaction_type || null
        : null;

    return {
      ok: true,
      summary: {
        ...counts,
        totalReactions,
        commentCount:
          commentResult.count || 0,
        currentUserReaction,
      },
    };
  } catch (error) {
    console.log(
      "fetchPartnerPostInteractionSummary error:",
      error
    );

    return {
      ok: false,
      summary: emptySummary,
      error,
    };
  }
}

export async function setPartnerPostReaction({
  partnerPostId,
  userId,
  reactionType,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing Partner Post id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing reaction user id"
      );
    }

    const cleanReactionType =
      String(
        reactionType || ""
      )
        .trim()
        .toLowerCase();

    const allowedReactionTypes =
      PARTNER_POST_REACTION_TYPES.map(
        (reaction) =>
          reaction.value
      );

    if (
      !allowedReactionTypes.includes(
        cleanReactionType
      )
    ) {
      throw new Error(
        "Invalid Partner Post reaction type"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_post_reactions"
        )
        .upsert(
          {
            partner_post_id:
              partnerPostId,
            user_id:
              userId,
            reaction_type:
              cleanReactionType,
          },
          {
            onConflict:
              "partner_post_id,user_id",
          }
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      reaction: data,
    };
  } catch (error) {
    console.log(
      "setPartnerPostReaction error:",
      error
    );

    return {
      ok: false,
      reaction: null,
      error,
    };
  }
}

export async function removePartnerPostReaction({
  partnerPostId,
  userId,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing Partner Post id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing reaction user id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_post_reactions"
        )
        .delete()
        .eq(
          "partner_post_id",
          partnerPostId
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "removePartnerPostReaction error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}

export async function fetchPartnerPostComments({
  partnerPostId,
  limit = 100,
} = {}) {
  try {
    if (!partnerPostId) {
      return {
        ok: true,
        comments: [],
      };
    }

    const {
      data: commentRows,
      error: commentsError,
    } = await supabase
      .from(
        "partner_post_comments"
      )
      .select(
        `
        id,
        partner_post_id,
        user_id,
        parent_comment_id,
        content,
        status,
        created_at,
        updated_at
      `
      )
      .eq(
        "partner_post_id",
        partnerPostId
      )
      .eq(
        "status",
        "published"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      )
      .limit(limit);

    if (commentsError) {
      throw commentsError;
    }

    const comments =
      commentRows || [];

    const userIds = [
      ...new Set(
        comments
          .map(
            (comment) =>
              comment.user_id
          )
          .filter(Boolean)
      ),
    ];

    let profilesById = {};

    if (userIds.length > 0) {
      const {
        data: profileRows,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          avatar_url
        `
        )
        .in(
          "id",
          userIds
        );

      if (profilesError) {
        console.log(
          "fetchPartnerPostComments profile lookup error:",
          profilesError
        );
      } else {
        profilesById = (
          profileRows || []
        ).reduce(
          (
            result,
            profile
          ) => {
            result[
              profile.id
            ] = profile;

            return result;
          },
          {}
        );
      }
    }

    return {
      ok: true,
      comments:
        comments.map(
          (comment) => ({
            ...comment,
            profile:
              profilesById[
                comment.user_id
              ] || null,
          })
        ),
    };
  } catch (error) {
    console.log(
      "fetchPartnerPostComments error:",
      error
    );

    return {
      ok: false,
      comments: [],
      error,
    };
  }
}

export async function createPartnerPostComment({
  partnerPostId,
  userId,
  content,
  parentCommentId = null,
} = {}) {
  try {
    if (!partnerPostId) {
      throw new Error(
        "Missing Partner Post id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing comment user id"
      );
    }

    const cleanContent =
      String(
        content || ""
      ).trim();

    if (!cleanContent) {
      throw new Error(
        "Comment cannot be empty"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_post_comments"
        )
        .insert({
          partner_post_id:
            partnerPostId,
          user_id:
            userId,
          parent_comment_id:
            parentCommentId || null,
          content:
            cleanContent,
          status:
            "published",
        })
        .select(
          `
          id,
          partner_post_id,
          user_id,
          parent_comment_id,
          content,
          status,
          created_at,
          updated_at
        `
        )
        .single();

    if (error) {
      throw error;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
        id,
        display_name,
        avatar_url
      `
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (profileError) {
      console.log(
        "createPartnerPostComment profile lookup error:",
        profileError
      );
    }

    return {
      ok: true,
      comment: {
        ...data,
        profile:
          profile || null,
      },
    };
  } catch (error) {
    console.log(
      "createPartnerPostComment error:",
      error
    );

    return {
      ok: false,
      comment: null,
      error,
    };
  }
}

export async function updatePartnerPostComment({
  commentId,
  content,
} = {}) {
  try {
    if (!commentId) {
      throw new Error(
        "Missing Partner Post comment id"
      );
    }

    const cleanContent =
      String(
        content || ""
      ).trim();

    if (!cleanContent) {
      throw new Error(
        "Comment cannot be empty"
      );
    }

    const { data, error } =
      await supabase
        .from(
          "partner_post_comments"
        )
        .update({
          content:
            cleanContent,
        })
        .eq(
          "id",
          commentId
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      comment: data,
    };
  } catch (error) {
    console.log(
      "updatePartnerPostComment error:",
      error
    );

    return {
      ok: false,
      comment: null,
      error,
    };
  }
}

export async function deletePartnerPostComment(
  commentId
) {
  try {
    if (!commentId) {
      throw new Error(
        "Missing Partner Post comment id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_post_comments"
        )
        .delete()
        .eq(
          "id",
          commentId
        );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "deletePartnerPostComment error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}
// ============================================================
// PARTNER PROFILE CONNECTIONS
// Users connect with Partner Profiles.
// This is separate from user-to-user profile connections.
// ============================================================

export async function fetchPartnerProfileConnectionState({
  partnerProfileId,
  currentUserId = null,
} = {}) {
  const emptyState = {
    isConnected: false,
    connectionCount: 0,
  };

  try {
    if (!partnerProfileId) {
      return {
        ok: true,
        state: emptyState,
      };
    }

    const countResult = await supabase
      .from(
        "partner_profile_connections"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "partner_profile_id",
        partnerProfileId
      );

    if (countResult.error) {
      throw countResult.error;
    }

    let isConnected = false;

    if (currentUserId) {
      const {
        data: connectionData,
        error: connectionError,
      } = await supabase
        .from(
          "partner_profile_connections"
        )
        .select("id")
        .eq(
          "partner_profile_id",
          partnerProfileId
        )
        .eq(
          "user_id",
          currentUserId
        )
        .maybeSingle();

      if (connectionError) {
        throw connectionError;
      }

      isConnected = Boolean(
        connectionData?.id
      );
    }

    return {
      ok: true,
      state: {
        isConnected,
        connectionCount:
          Number(
            countResult.count
          ) || 0,
      },
    };
  } catch (error) {
    console.log(
      "fetchPartnerProfileConnectionState error:",
      error
    );

    return {
      ok: false,
      error,
      state: emptyState,
    };
  }
}

export async function connectToPartnerProfile({
  partnerProfileId,
  userId,
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error(
        "Missing Partner Profile id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing user id"
      );
    }

    const {
      data: existingConnection,
      error: existingError,
    } = await supabase
      .from(
        "partner_profile_connections"
      )
      .select("id")
      .eq(
        "partner_profile_id",
        partnerProfileId
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingConnection?.id) {
      return {
        ok: true,
        connection:
          existingConnection,
        alreadyConnected: true,
      };
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "partner_profile_connections"
      )
      .insert({
        partner_profile_id:
          partnerProfileId,
        user_id: userId,
      })
      .select(
        `
        id,
        partner_profile_id,
        user_id,
        created_at
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      connection: data,
      alreadyConnected: false,
    };
  } catch (error) {
    console.log(
      "connectToPartnerProfile error:",
      error
    );

    return {
      ok: false,
      error,
      connection: null,
      alreadyConnected: false,
    };
  }
}

export async function disconnectFromPartnerProfile({
  partnerProfileId,
  userId,
} = {}) {
  try {
    if (!partnerProfileId) {
      throw new Error(
        "Missing Partner Profile id"
      );
    }

    if (!userId) {
      throw new Error(
        "Missing user id"
      );
    }

    const { error } =
      await supabase
        .from(
          "partner_profile_connections"
        )
        .delete()
        .eq(
          "partner_profile_id",
          partnerProfileId
        )
        .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.log(
      "disconnectFromPartnerProfile error:",
      error
    );

    return {
      ok: false,
      error,
    };
  }
}

export async function fetchPartnerProfileConnections({
  partnerProfileId,
  limit = 50,
} = {}) {
  try {
    if (!partnerProfileId) {
      return {
        ok: true,
        connections: [],
      };
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      200
    );

    const {
      data: connectionRows,
      error: connectionError,
    } = await supabase
      .from(
        "partner_profile_connections"
      )
      .select(
        `
        id,
        partner_profile_id,
        user_id,
        created_at
      `
      )
      .eq(
        "partner_profile_id",
        partnerProfileId
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(safeLimit);

    if (connectionError) {
      throw connectionError;
    }

    const userIds = [
      ...new Set(
        (connectionRows || [])
          .map(
            (connection) =>
              connection.user_id
          )
          .filter(Boolean)
      ),
    ];

    if (userIds.length === 0) {
      return {
        ok: true,
        connections: [],
      };
    }

    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        `
        id,
        display_name,
        handle,
        avatar_url
      `
      )
      .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    const profilesById = (
      profiles || []
    ).reduce(
      (result, profile) => {
        result[profile.id] =
          profile;

        return result;
      },
      {}
    );

    const connections = (
      connectionRows || []
    ).map((connection) => ({
      ...connection,
      profile:
        profilesById[
          connection.user_id
        ] || null,
    }));

    return {
      ok: true,
      connections,
    };
  } catch (error) {
    console.log(
      "fetchPartnerProfileConnections error:",
      error
    );

    return {
      ok: false,
      error,
      connections: [],
    };
  }
}

export async function fetchMyConnectedPartnerProfiles({
  userId,
  limit = 100,
} = {}) {
  try {
    if (!userId) {
      return {
        ok: true,
        partners: [],
      };
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 100,
        1
      ),
      250
    );

    const {
      data: connectionRows,
      error: connectionError,
    } = await supabase
      .from(
        "partner_profile_connections"
      )
      .select(
        `
        id,
        partner_profile_id,
        user_id,
        created_at
      `
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(safeLimit);

    if (connectionError) {
      throw connectionError;
    }

    const partnerProfileIds = [
      ...new Set(
        (connectionRows || [])
          .map(
            (connection) =>
              connection
                .partner_profile_id
          )
          .filter(Boolean)
      ),
    ];

    if (
      partnerProfileIds.length === 0
    ) {
      return {
        ok: true,
        partners: [],
      };
    }

    const {
      data: partnerProfiles,
      error: partnersError,
    } = await supabase
      .from("partner_profiles")
      .select("*")
      .in("id", partnerProfileIds);

    if (partnersError) {
      throw partnersError;
    }

    const connectionByPartnerId = (
      connectionRows || []
    ).reduce(
      (
        result,
        connection
      ) => {
        result[
          connection.partner_profile_id
        ] = connection;

        return result;
      },
      {}
    );

    const partners = (
      partnerProfiles || []
    )
      .map((partner) => ({
        ...partner,
        connection:
          connectionByPartnerId[
            partner.id
          ] || null,
      }))
      .sort((first, second) => {
        const firstDate =
          new Date(
            first?.connection
              ?.created_at || 0
          ).getTime();

        const secondDate =
          new Date(
            second?.connection
              ?.created_at || 0
          ).getTime();

        return (
          secondDate - firstDate
        );
      });

    return {
      ok: true,
      partners,
    };
  } catch (error) {
    console.log(
      "fetchMyConnectedPartnerProfiles error:",
      error
    );

    return {
      ok: false,
      error,
      partners: [],
    };
  }
}
// ============================================================
// CONNECTED PARTNER COMMUNITY FEED
// Loads recent posts only from Partner Profiles the user has
// deliberately connected with.
// ============================================================

export async function fetchConnectedPartnerFeedPosts({
  userId,
  limit = 20,
} = {}) {
  try {
    if (!userId) {
      return {
        ok: true,
        posts: [],
      };
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      50
    );

    const {
      data: connectionRows,
      error: connectionsError,
    } = await supabase
      .from(
        "partner_profile_connections"
      )
      .select(
        "partner_profile_id"
      )
      .eq("user_id", userId);

    if (connectionsError) {
      throw connectionsError;
    }

    const partnerProfileIds = [
      ...new Set(
        (connectionRows || [])
          .map(
            (connection) =>
              connection
                .partner_profile_id
          )
          .filter(Boolean)
      ),
    ];

    if (
      partnerProfileIds.length === 0
    ) {
      return {
        ok: true,
        posts: [],
      };
    }

    const [
      partnerProfilesResult,
      partnerPostsResult,
    ] = await Promise.all([
      supabase
        .from("partner_profiles")
        .select(
          `
          id,
          owner_id,
          name,
          slug,
          partner_type,
          category,
          short_description,
          logo_url,
          cover_image_url,
          is_verified,
          verification_status,
          status
        `
        )
        .in("id", partnerProfileIds)
        .eq("status", "published"),

      supabase
        .from("partner_posts")
        .select(
          `
          id,
          partner_profile_id,
          author_id,
          title,
          content,
          media_url,
          media_type,
          link_url,
          link_title,
          link_description,
          link_image,
          post_type,
          status,
          created_at,
          updated_at
        `
        )
        .in(
          "partner_profile_id",
          partnerProfileIds
        )
        .eq("status", "published")
        .order("created_at", {
          ascending: false,
        })
        .limit(safeLimit),
    ]);

    if (partnerProfilesResult.error) {
      throw partnerProfilesResult.error;
    }

    if (partnerPostsResult.error) {
      throw partnerPostsResult.error;
    }

    const partnersById = (
      partnerProfilesResult.data || []
    ).reduce(
      (result, partner) => {
        if (partner?.id) {
          result[partner.id] =
            partner;
        }

        return result;
      },
      {}
    );

    const posts = (
      partnerPostsResult.data || []
    )
      .map((post) => {
        const partner =
          partnersById[
            post.partner_profile_id
          ] || null;

        if (!partner) {
          return null;
        }

        return {
          ...post,

          // Prevent collisions with normal
          // Community post IDs when the
          // feeds are combined.
          feed_key:
            `partner:${post.id}`,

          feed_source:
            "partner",

          partner,
        };
      })
      .filter(Boolean);

    return {
      ok: true,
      posts,
    };
  } catch (error) {
    console.log(
      "fetchConnectedPartnerFeedPosts error:",
      error
    );

    return {
      ok: false,
      posts: [],
      error,
    };
  }
}