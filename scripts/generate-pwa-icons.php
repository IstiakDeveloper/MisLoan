<?php

/**
 * Generate PWA/favicon icons and report dominant colors from public/icons/logo.png.
 */
$sourcePath = dirname(__DIR__).'/public/icons/logo.png';

if (! file_exists($sourcePath)) {
    fwrite(STDERR, "Missing source logo: {$sourcePath}\n");
    exit(1);
}

$source = imagecreatefrompng($sourcePath);

if ($source === false) {
    fwrite(STDERR, "Unable to read PNG: {$sourcePath}\n");
    exit(1);
}

$srcWidth = imagesx($source);
$srcHeight = imagesy($source);

imagealphablending($source, true);
imagesavealpha($source, true);

$counts = [];
$step = max(1, (int) ($srcWidth / 90));

for ($y = 0; $y < $srcHeight; $y += $step) {
    for ($x = 0; $x < $srcWidth; $x += $step) {
        $rgba = imagecolorat($source, $x, $y);
        $a = ($rgba >> 24) & 0x7F;

        if ($a > 40) {
            continue;
        }

        $r = ($rgba >> 16) & 0xFF;
        $g = ($rgba >> 8) & 0xFF;
        $b = $rgba & 0xFF;
        $l = ($r + $g + $b) / 3;

        if ($l < 18 || $l > 245) {
            continue;
        }

        $key = sprintf('#%02x%02x%02x', (int) ($r / 16) * 16, (int) ($g / 16) * 16, (int) ($b / 16) * 16);
        $counts[$key] = ($counts[$key] ?? 0) + 1;
    }
}

arsort($counts);

echo "Source: {$srcWidth}x{$srcHeight}\nDominant colors:\n";

$i = 0;
foreach ($counts as $color => $n) {
    echo "  {$color} {$n}\n";
    $i++;

    if ($i >= 20) {
        break;
    }
}

$corners = [
    [0, 0],
    [$srcWidth - 1, 0],
    [0, $srcHeight - 1],
    [$srcWidth - 1, $srcHeight - 1],
];

echo "Corners:\n";
foreach ($corners as [$x, $y]) {
    $rgba = imagecolorat($source, $x, $y);
    $r = ($rgba >> 16) & 0xFF;
    $g = ($rgba >> 8) & 0xFF;
    $b = $rgba & 0xFF;
    printf("  %d,%d #%02x%02x%02x\n", $x, $y, $r, $g, $b);
}

$bgRgba = imagecolorat($source, 0, 0);
$bgR = ($bgRgba >> 16) & 0xFF;
$bgG = ($bgRgba >> 8) & 0xFF;
$bgB = $bgRgba & 0xFF;

$iconsDir = dirname(__DIR__).'/public/icons';
$publicDir = dirname(__DIR__).'/public';

if (! is_dir($iconsDir)) {
    mkdir($iconsDir, 0755, true);
}

function makeSquareIcon(GdImage $source, int $size, float $contentRatio, int $bgR, int $bgG, int $bgB): GdImage
{
    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);

    $bg = imagecolorallocatealpha($canvas, $bgR, $bgG, $bgB, 0);
    imagefilledrectangle($canvas, 0, 0, $size, $size, $bg);

    imagealphablending($canvas, true);

    $srcWidth = imagesx($source);
    $srcHeight = imagesy($source);
    $box = (int) round($size * $contentRatio);
    $scale = min($box / $srcWidth, $box / $srcHeight);
    $dstW = max(1, (int) round($srcWidth * $scale));
    $dstH = max(1, (int) round($srcHeight * $scale));
    $dstX = (int) round(($size - $dstW) / 2);
    $dstY = (int) round(($size - $dstH) / 2);

    imagecopyresampled($canvas, $source, $dstX, $dstY, 0, 0, $dstW, $dstH, $srcWidth, $srcHeight);

    return $canvas;
}

function savePng(GdImage $image, string $path): void
{
    imagealphablending($image, false);
    imagesavealpha($image, true);
    imagepng($image, $path, 6);
    imagedestroy($image);
    echo "Wrote {$path} (".filesize($path)." bytes)\n";
}

$anyIcons = [
    192 => $iconsDir.'/icon-192.png',
    512 => $iconsDir.'/icon-512.png',
    180 => $publicDir.'/apple-touch-icon.png',
    32 => $publicDir.'/favicon-32x32.png',
    16 => $publicDir.'/favicon-16x16.png',
];

foreach ($anyIcons as $size => $path) {
    savePng(makeSquareIcon($source, $size, 0.92, $bgR, $bgG, $bgB), $path);
}

$maskableIcons = [
    192 => $iconsDir.'/icon-192-maskable.png',
    512 => $iconsDir.'/icon-512-maskable.png',
];

foreach ($maskableIcons as $size => $path) {
    savePng(makeSquareIcon($source, $size, 0.72, $bgR, $bgG, $bgB), $path);
}

$png = file_get_contents($publicDir.'/favicon-32x32.png');

if ($png === false) {
    fwrite(STDERR, "Unable to read generated favicon PNG\n");
    exit(1);
}
$ico = pack('v3', 0, 1, 1);
$ico .= pack('C4v2V2', 32, 32, 0, 0, 1, 32, strlen($png), 22);
$ico .= $png;
file_put_contents($publicDir.'/favicon.ico', $ico);
echo "Wrote {$publicDir}/favicon.ico (".filesize($publicDir.'/favicon.ico')." bytes)\n";

imagedestroy($source);
echo "Done.\n";
