import { Ionicons } from "@expo/vector-icons";
import {
    Image,
    Platform,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const OLIVE_SOFT =
  "rgba(79, 99, 59, 0.10)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.4,
};

function GalleryItem({
  item,
  width,
  isOwner,
  onPress,
  onManage,
}) {
  const isVideo =
    String(
      item?.media_type || ""
    ).toLowerCase() === "video";

  const previewUrl = isVideo
    ? item?.thumbnail_url || ""
    : item?.media_url || "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        marginBottom: 10,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: OLIVE_SOFT,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: pressed
          ? 0.03
          : 0.09,
        shadowRadius: pressed
          ? 3
          : 8,
        shadowOffset: {
          width: 0,
          height: pressed ? 1 : 4,
        },
        elevation: pressed ? 1 : 3,
        transform: [
          {
            translateY:
              pressed ? 2 : 0,
          },
          {
            scale:
              pressed
                ? 0.985
                : 1,
          },
        ],
      })}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          backgroundColor:
            OLIVE_SOFT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {previewUrl ? (
          <Image
            source={{
              uri: previewUrl,
            }}
            resizeMode="cover"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <Ionicons
            name={
              isVideo
                ? "videocam-outline"
                : "image-outline"
            }
            size={30}
            color={OLIVE}
          />
        )}

        {isVideo ? (
          <View
            style={{
              position: "absolute",
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor:
                "rgba(15,23,42,0.70)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.60)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="play"
              size={23}
              color={SURFACE}
              style={{
                marginLeft: 2,
              }}
            />
          </View>
        ) : null}

        {isOwner && onManage ? (
          <Pressable
            onPress={(event) => {
              event?.stopPropagation?.();
              onManage(item);
            }}
            hitSlop={8}
            style={({ pressed }) => ({
              position: "absolute",
              top: 9,
              right: 9,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                "rgba(15,23,42,0.76)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.42)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed
                ? 0.72
                : 1,
              transform: [
                {
                  translateY:
                    pressed ? 2 : 0,
                },
                {
                  scale:
                    pressed
                      ? 0.95
                      : 1,
                },
              ],
            })}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={SURFACE}
            />
          </Pressable>
        ) : null}
      </View>

      {String(
        item?.caption || ""
      ).trim() ? (
        <View
          style={{
            paddingHorizontal: 11,
            paddingVertical: 10,
          }}
        >
          <Text
            numberOfLines={2}
            style={{
              color: TEXT,
              fontSize: 12.5,
              lineHeight: 17,
              fontWeight: "800",
            }}
          >
            {item.caption}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function PartnerGalleryCard({
  items = [],
  isOwner = false,
  onOpenItem,
  onAddMedia,
  onManageItem,
  onReorder,
}) {
  const { width: screenWidth } =
    useWindowDimensions();

  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  const horizontalPagePadding = 32;
  const cardInnerPadding = 24;
  const columnGap = 10;

  const availableWidth =
    screenWidth -
    horizontalPagePadding -
    cardInnerPadding;

  const itemWidth = Math.max(
    120,
    (availableWidth -
      columnGap) /
      2
  );

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: SURFACE,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        padding: 12,
        shadowColor: SHADOW,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: {
          width: 0,
          height: 5,
        },
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent:
            "space-between",
          paddingHorizontal: 4,
          paddingTop: 3,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingRight: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor:
                  AMBER_SOFT,
                borderWidth: 1,
                borderColor:
                  AMBER_BORDER,
                alignItems: "center",
                justifyContent:
                  "center",
                marginRight: 10,
              }}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={EVENT_AMBER}
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 20,
                  lineHeight: 25,
                }}
              >
                Gallery
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 17,
                  fontWeight: "700",
                  marginTop: 1,
                }}
              >
                Work, products, people and
                moments
              </Text>
            </View>
          </View>
        </View>

        {isOwner ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
            }}
          >
            {safeItems.length > 1 && onReorder ? (
              <Pressable
                onPress={onReorder}
                style={({ pressed }) => ({
                  minHeight: 38,
                  paddingHorizontal: 11,
                  borderRadius: 999,
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor:
                    "rgba(79, 99, 59, 0.18)",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.72 : 1,
                  transform: [
                    {
                      translateY: pressed ? 2 : 0,
                    },
                    {
                      scale: pressed ? 0.98 : 1,
                    },
                  ],
                })}
              >
                <Ionicons
                  name="swap-vertical-outline"
                  size={16}
                  color={OLIVE}
                  style={{
                    marginRight: 4,
                  }}
                />

                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  Reorder
                </Text>
              </Pressable>
            ) : null}

            {onAddMedia ? (
              <Pressable
                onPress={onAddMedia}
                style={({ pressed }) => ({
                  minHeight: 38,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  backgroundColor: EVENT_AMBER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: EVENT_BROWN,
                  shadowOpacity: pressed
                    ? 0.08
                    : 0.18,
                  shadowRadius: pressed ? 2 : 6,
                  shadowOffset: {
                    width: 0,
                    height: pressed ? 1 : 3,
                  },
                  elevation: pressed ? 1 : 3,
                  transform: [
                    {
                      translateY: pressed ? 2 : 0,
                    },
                    {
                      scale: pressed ? 0.98 : 1,
                    },
                  ],
                })}
              >
                <Ionicons
                  name="add"
                  size={17}
                  color={SURFACE}
                  style={{
                    marginRight: 4,
                  }}
                />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Add
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {safeItems.length === 0 ? (
        <View
          style={{
            borderRadius: 20,
            backgroundColor:
              OLIVE_SOFT,
            borderWidth: 1,
            borderColor:
              "rgba(79,99,59,0.16)",
            paddingHorizontal: 20,
            paddingVertical: 28,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor:
                SURFACE,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
              marginBottom: 12,
            }}
          >
            <Ionicons
              name="images-outline"
              size={25}
              color={OLIVE}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 18,
              lineHeight: 23,
              textAlign: "center",
            }}
          >
            Gallery coming to life
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13,
              lineHeight: 19,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 6,
              maxWidth: 280,
            }}
          >
            {isOwner
              ? "Add images that showcase your work, products, people and impact."
              : "This partner has not added any gallery media yet."}
          </Text>

          {isOwner && onAddMedia ? (
            <Pressable
              onPress={onAddMedia}
              style={({ pressed }) => ({
                marginTop: 16,
                minHeight: 43,
                paddingHorizontal: 17,
                borderRadius: 999,
                backgroundColor:
                  EVENT_AMBER,
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "center",
                shadowColor:
                  EVENT_BROWN,
                shadowOpacity:
                  pressed
                    ? 0.08
                    : 0.18,
                shadowRadius:
                  pressed ? 2 : 6,
                shadowOffset: {
                  width: 0,
                  height:
                    pressed ? 1 : 3,
                },
                elevation:
                  pressed ? 1 : 3,
                transform: [
                  {
                    translateY:
                      pressed ? 2 : 0,
                  },
                  {
                    scale:
                      pressed
                        ? 0.98
                        : 1,
                  },
                ],
              })}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={SURFACE}
                style={{
                  marginRight: 6,
                }}
              />

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Add gallery media
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent:
              "space-between",
          }}
        >
          {safeItems.map(
            (item, index) => (
              <GalleryItem
                key={
                  item?.id ||
                  `gallery-${index}`
                }
                item={item}
                width={itemWidth}
                isOwner={isOwner}
                onPress={() =>
                  onOpenItem?.(
                    item,
                    index
                  )
                }
                onManage={
                  onManageItem
                }
              />
            )
          )}
        </View>
      )}
    </View>
  );
}