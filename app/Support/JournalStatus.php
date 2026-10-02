<?php

namespace App\Support;

final class JournalStatus
{
    public const POST = 'Post';

    public const UNPOST = 'UnPost';

    /**
     * Canonical application-level journal status values.
     *
     * Repository evidence shows the persisted database literals are inconsistent
     * across the codebase (Post, Posted, posted, UnPost, Unposted, etc.). The
     * application should normalize those values at the boundary and operate on a
     * single representation internally: Post / UnPost.
     */
    public static function normalize(?string $status): ?string
    {
        if ($status === null) {
            return null;
        }

        $status = trim((string) $status);
        if ($status === '') {
            return self::UNPOST;
        }

        $lower = strtolower($status);

        return match ($lower) {
            'post', 'posted' => self::POST,
            'unpost', 'unposted' => self::UNPOST,
            default => $status,
        };
    }

    public static function isPosted(?string $status): bool
    {
        $normalized = self::normalize($status);

        return in_array($normalized, [self::POST], true);
    }

    public static function isUnposted(?string $status): bool
    {
        $normalized = self::normalize($status);

        return in_array($normalized, [self::UNPOST], true);
    }

    /**
     * Legacy database values still seen in the wild; used for compatibility when
     * filtering on persisted literals.
     */
    public static function postedValues(): array
    {
        return ['Post', 'Posted', 'posted'];
    }

    public static function unpostedValues(): array
    {
        return ['UnPost', 'Unposted', 'unposted'];
    }
}
