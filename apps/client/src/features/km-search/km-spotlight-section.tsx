// pinup-km fork: "AI แนะนำ" block at the top of the Ctrl+K search.
import { Group, Text } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSparkles, IconArrowRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useKmSearch } from "./km-search";

export function KmSpotlightSection({ query }: { query: string }) {
  const { data, isFetching, isError } = useKmSearch(query, 3);
  if (!query.trim() || isError) return null;

  return (
    <>
      <Group gap={6} px="sm" pt="xs" pb={4}>
        <IconSparkles size={14} />
        <Text size="xs" fw={600} c="dimmed">
          AI แนะนำ
        </Text>
      </Group>
      {isFetching && !data && (
        <Text size="sm" c="dimmed" px="sm" py={6}>
          กำลังหา…
        </Text>
      )}
      {data?.length === 0 && (
        <Text size="sm" c="dimmed" px="sm" py={6}>
          AI ไม่เจอหน้าที่ตรง
        </Text>
      )}
      {data?.map((r) => (
        <Spotlight.Action
          key={r.url}
          component={Link}
          //@ts-ignore
          to={r.url}
          style={{ userSelect: "none" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text truncate fw={500}>
              {r.title || "ไม่มีชื่อ"}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {r.space} · {r.snippet}
            </Text>
          </div>
        </Spotlight.Action>
      ))}
      {!!data?.length && (
        <Spotlight.Action
          component={Link}
          //@ts-ignore
          to={`/find?q=${encodeURIComponent(query.trim())}`}
        >
          <Group gap={6}>
            <Text size="sm" c="blue">
              ดูผล AI ทั้งหมด
            </Text>
            <IconArrowRight size={14} />
          </Group>
        </Spotlight.Action>
      )}
      <Text size="xs" fw={600} c="dimmed" px="sm" pt="sm" pb={4}>
        ค้นหาคำตรงตัว
      </Text>
    </>
  );
}
