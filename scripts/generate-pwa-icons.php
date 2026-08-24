<?php

/**
 * Generate the full PWA / Apple / Windows / favicon set from public/icons/logo.png.
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

imagealphablending($source, true);
imagesavealpha($source, true);

$bgRgba = imagecolorat($source, 0, 0);
$bgR = ($bgRgba >> 16) & 0xFF;
$bgG = ($bgRgba >> 8) & 0xFF;
$bgB = $bgRgba & 0xFF;

$brandDark = [0, 64, 48];
$brand = [0, 128, 48];

$root = dirname(__DIR__);
$publicDir = $root.'/public';
$iconsDir = $publicDir.'/icons';
$splashDir = $publicDir.'/splash';
$screenshotsDir = $publicDir.'/screenshots';

foreach ([$iconsDir, $splashDir, $screenshotsDir] as $dir) {
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

function pasteLogo(GdImage $canvas, GdImage $source, int $box, int $centerX, int $centerY): void
{
    $srcWidth = imagesx($source);
    $srcHeight = imagesy($source);
    $scale = min($box / $srcWidth, $box / $srcHeight);
    $dstW = max(1, (int) round($srcWidth * $scale));
    $dstH = max(1, (int) round($srcHeight * $scale));
    $dstX = (int) round($centerX - ($dstW / 2));
    $dstY = (int) round($centerY - ($dstH / 2));

    imagealphablending($canvas, true);
    imagecopyresampled($canvas, $source, $dstX, $dstY, 0, 0, $dstW, $dstH, $srcWidth, $srcHeight);
}

function makeCanvas(int $width, int $height, int $r, int $g, int $b): GdImage
{
    $canvas = imagecreatetruecolor($width, $height);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);
    $bg = imagecolorallocatealpha($canvas, $r, $g, $b, 0);
    imagefilledrectangle($canvas, 0, 0, $width, $height, $bg);
    imagealphablending($canvas, true);

    return $canvas;
}

function makeSquareIcon(GdImage $source, int $size, float $contentRatio, int $bgR, int $bgG, int $bgB): GdImage
{
    $canvas = makeCanvas($size, $size, $bgR, $bgG, $bgB);
    pasteLogo($canvas, $source, (int) round($size * $contentRatio), (int) round($size / 2), (int) round($size / 2));

    return $canvas;
}

function makeWideTile(GdImage $source, int $width, int $height, int $bgR, int $bgG, int $bgB): GdImage
{
    $canvas = makeCanvas($width, $height, $bgR, $bgG, $bgB);
    pasteLogo($canvas, $source, (int) round($height * 0.82), (int) round($width / 2), (int) round($height / 2));

    return $canvas;
}

function savePng(GdImage $image, string $path): void
{
    imagealphablending($image, false);
    imagesavealpha($image, true);
    imagepng($image, $path, 6);
    imagedestroy($image);
    echo 'Wrote '.$path.' ('.filesize($path)." bytes)\n";
}

function firstExistingFont(array $paths): ?string
{
    foreach ($paths as $path) {
        if (is_file($path)) {
            return $path;
        }
    }

    return null;
}

$squareIcons = [
    16 => $publicDir.'/favicon-16x16.png',
    32 => $publicDir.'/favicon-32x32.png',
    48 => $iconsDir.'/icon-48.png',
    72 => $iconsDir.'/icon-72.png',
    96 => $iconsDir.'/icon-96.png',
    128 => $iconsDir.'/icon-128.png',
    144 => $iconsDir.'/icon-144.png',
    152 => $iconsDir.'/apple-touch-icon-152.png',
    167 => $iconsDir.'/apple-touch-icon-167.png',
    180 => $publicDir.'/apple-touch-icon.png',
    192 => $iconsDir.'/icon-192.png',
    256 => $iconsDir.'/icon-256.png',
    384 => $iconsDir.'/icon-384.png',
    512 => $iconsDir.'/icon-512.png',
];

foreach ($squareIcons as $size => $path) {
    savePng(makeSquareIcon($source, $size, 0.92, $bgR, $bgG, $bgB), $path);
}

copy($publicDir.'/apple-touch-icon.png', $iconsDir.'/apple-touch-icon-180.png');
copy($publicDir.'/apple-touch-icon.png', $publicDir.'/apple-touch-icon-precomposed.png');
savePng(makeSquareIcon($source, 120, 0.92, $bgR, $bgG, $bgB), $iconsDir.'/apple-touch-icon-120.png');

foreach ([192, 512] as $size) {
    savePng(makeSquareIcon($source, $size, 0.72, $bgR, $bgG, $bgB), $iconsDir."/icon-{$size}-maskable.png");
}

savePng(makeSquareIcon($source, 128, 0.86, $bgR, $bgG, $bgB), $iconsDir.'/mstile-70x70.png');
savePng(makeSquareIcon($source, 270, 0.86, $bgR, $bgG, $bgB), $iconsDir.'/mstile-150x150.png');
savePng(makeSquareIcon($source, 310, 0.86, $bgR, $bgG, $bgB), $iconsDir.'/mstile-310x310.png');
savePng(makeWideTile($source, 310, 150, $bgR, $bgG, $bgB), $iconsDir.'/mstile-310x150.png');

$splashes = [
    'iphone-se' => [750, 1334],
    'iphone-8-plus' => [1242, 2208],
    'iphone-x' => [1125, 2436],
    'iphone-xr' => [828, 1792],
    'iphone-xs-max' => [1242, 2688],
    'iphone-12' => [1170, 2532],
    'iphone-12-pro-max' => [1284, 2778],
    'iphone-14-pro' => [1179, 2556],
    'iphone-14-pro-max' => [1290, 2796],
    'iphone-16-pro' => [1206, 2622],
    'iphone-16-pro-max' => [1320, 2868],
    'ipad' => [1536, 2048],
    'ipad-10' => [1620, 2160],
    'ipad-air' => [1640, 2360],
    'ipad-pro-11' => [1668, 2388],
    'ipad-pro-12' => [2048, 2732],
];

foreach ($splashes as $name => [$width, $height]) {
    $canvas = makeCanvas($width, $height, $brandDark[0], $brandDark[1], $brandDark[2]);
    $logoBox = (int) round(min($width, $height) * 0.42);
    pasteLogo($canvas, $source, $logoBox, (int) round($width / 2), (int) round($height / 2));
    savePng($canvas, $splashDir."/{$name}.png");

    $landscape = makeCanvas($height, $width, $brandDark[0], $brandDark[1], $brandDark[2]);
    $landscapeBox = (int) round(min($width, $height) * 0.42);
    pasteLogo($landscape, $source, $landscapeBox, (int) round($height / 2), (int) round($width / 2));
    savePng($landscape, $splashDir."/{$name}-landscape.png");
}

$fontBold = firstExistingFont([
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]);
$fontRegular = firstExistingFont([
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]);

$screenshots = [
    'narrow' => [1080, 1920, 'narrow'],
    'wide' => [1920, 1080, 'wide'],
];

foreach ($screenshots as $name => [$width, $height, $form]) {
    $canvas = makeCanvas($width, $height, 255, 255, 255);
    $pad = (int) round(min($width, $height) * 0.08);
    $headerH = (int) round($height * ($form === 'wide' ? 0.18 : 0.14));
    $header = imagecolorallocate($canvas, $brand[0], $brand[1], $brand[2]);
    imagefilledrectangle($canvas, 0, 0, $width, $headerH, $header);

    $logoBox = (int) round(min($width, $height) * ($form === 'wide' ? 0.46 : 0.52));
    pasteLogo($canvas, $source, $logoBox, (int) round($width / 2), (int) round($height * ($form === 'wide' ? 0.52 : 0.46)));

    if ($fontBold && $fontRegular) {
        $white = imagecolorallocate($canvas, 255, 255, 255);
        $muted = imagecolorallocate($canvas, 0, 64, 48);
        $titleSize = $form === 'wide' ? 42 : 36;
        $tagSize = $form === 'wide' ? 20 : 22;
        $title = 'MisLoan';
        $tag = 'Member  •  Loan  •  Approval';
        $titleBox = imagettfbbox($titleSize, 0, $fontBold, $title);
        $tagBox = imagettfbbox($tagSize, 0, $fontRegular, $tag);
        $titleW = $titleBox[2] - $titleBox[0];
        $tagW = $tagBox[2] - $tagBox[0];
        imagettftext($canvas, $titleSize, 0, (int) round(($width - $titleW) / 2), (int) round($headerH * 0.58), $white, $fontBold, $title);
        imagettftext($canvas, $tagSize, 0, (int) round(($width - $tagW) / 2), (int) round($height - $pad * 1.4), $muted, $fontRegular, $tag);
    }

    savePng($canvas, $screenshotsDir."/{$name}.png");
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
echo 'Wrote '.$publicDir.'/favicon.ico ('.filesize($publicDir.'/favicon.ico')." bytes)\n";

imagedestroy($source);
echo "Done.\n";
