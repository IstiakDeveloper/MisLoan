# MisLoan VPS ডিপ্লয় গাইড

কোড সার্ভারে ওঠার পর এই ধাপগুলো চলবে। এক প্রতিষ্ঠানের এক ইনস্টল। লাইভ ডাটাবেসে টেস্ট চালাবেন না। মাইগ্রেশনের আগে ডাটাবেসের কপি নিয়ে একবার মহড়া করুন।

এই গাইড ধরে নিচ্ছে সার্ভার Ubuntu 24.04, ওয়েব সার্ভার Nginx, ডাটাবেস MySQL 8। অ্যাপের পাথ উদাহরণ: `/var/www/misloan`। নিজের পাথ বসিয়ে নিন।

## ১. সার্ভারে যা ইনস্টল করতে হবে

| জিনিস | কেন |
| --- | --- |
| PHP 8.4 + FPM | অ্যাপ এই ভার্সনে চলে |
| MySQL 8 | লাইভ ডাটাবেস। SQLite শুধু টেস্টের জন্য |
| Nginx | সাইট `public` ফোল্ডার থেকে চলবে |
| Composer | PHP প্যাকেজ |
| Node.js 22 | শুধু `npm run build` এর জন্য। বিল্ড শেষে Node চালু রাখতে হয় না |
| Redis | ক্যাশ, সেশন ও কিউ দ্রুত হয়। Redis চালু না করে `.env`-এ Redis দিবেন না |
| Supervisor | কিউ ওয়ার্কার পড়ে গেলে আবার তোলে |
| Certbot | HTTPS |

PHP এক্সটেনশন: `cli`, `fpm`, `mysql`, `mbstring`, `xml`, `curl`, `zip`, `gd`, `bcmath`, `intl`, `redis`, `opcache`।

```bash
sudo apt update
sudo apt install -y nginx mysql-server redis-server supervisor certbot python3-certbot-nginx \
  unzip git curl
sudo apt install -y php8.4-fpm php8.4-cli php8.4-mysql php8.4-mbstring php8.4-xml \
  php8.4-curl php8.4-zip php8.4-gd php8.4-bcmath php8.4-intl php8.4-redis php8.4-opcache
```

Ubuntu-র ডিফল্ট রিপোতে PHP 8.4 না থাকলে আগে Ondřej PHP রিপো যোগ করুন, তারপর উপরের `apt install` চালান।

Composer:

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Node 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

MySQL ও Redis শুধু নিজের মেশিনে শুনবে। বাইরে থেকে পোর্ট 3306 বা 6379 খুলবেন না।

```bash
sudo systemctl enable --now mysql redis-server nginx php8.4-fpm
```

## ২. ডাটাবেস

```sql
CREATE DATABASE misloan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'misloan'@'127.0.0.1' IDENTIFIED BY 'একটি_লম্বা_পাসওয়ার্ড';
GRANT ALL PRIVILEGES ON misloan.* TO 'misloan'@'127.0.0.1';
FLUSH PRIVILEGES;
```

পাসওয়ার্ড `.env`-এ রাখুন। গিটে দেবেন না।

## ৩. `.env`

`.env.example` কপি করে প্রোডাকশন মান বসান। নমুনা ফাইলের `APP_DEBUG=true`, SQLite আর `LOG_LEVEL=debug` লাইভে রাখবেন না। নমুনা ডিলিট পিনও বদলান।

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://আপনার-ডোমেইন
APP_TIMEZONE=Asia/Dhaka
APP_KEY=   # নিচে key:generate

LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=misloan
DB_USERNAME=misloan
DB_PASSWORD=উপরের_পাসওয়ার্ড
DB_TIMEZONE=+06:00

SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=MIS Loan

FILESYSTEM_DISK=local
```

Redis না বসানো পর্যন্ত তিনটি ড্রাইভার `database` রাখুন। `database` চলে, তবে প্রতি পেজে MySQL-এ বাড়তি পড়া হয়।

`APP_KEY` একবার তৈরি করে সেই মানের ব্যাকআপ রাখুন। চাবি বদলালে পুরনো সেশন ও এনক্রিপ্টেড মান খোলে না।

```bash
cd /var/www/misloan
php artisan key:generate
```

খালি রাখা যাবে, পরে দরকার হলে বসবে: `BLOCK_LIST_API_URL`, `BLOCK_LIST_API_TOKEN`, `HRM_API_URL`, `HRM_API_TOKEN`।

মেইল না বসালে পাসওয়ার্ড রিসেট লিংক যায় না। `MAIL_MAILER=log` রাখলে চিঠি শুধু লগ ফাইলে পড়ে।

## ৪. কোড, প্যাকেজ ও ফ্রন্টএন্ড বিল্ড

```bash
cd /var/www/misloan
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

`npm run dev` লাইভে চালাবেন না। বিল্ড `public/build` এ যায়। Vite ম্যানিফেস্ট এরর এলে এই বিল্ড আবার চালান।

## ৫. মাইগ্রেশন

আগে ডাম্প নিন। নতুন সার্ভারে খালি ডাটাবেস হলে সরাসরি চালানো যায়। পুরনো লাইভ ডাটাবেস হলে আগে ওই ডাম্প একটা স্টেজিং কপিতে `migrate` চালিয়ে দেখুন।

```bash
mysqldump -u misloan -p misloan > /root/backups/misloan-$(date +%F-%H%M).sql
php artisan migrate --force
```

এই ব্রাঞ্চে যে নতুন টেবিল আসে, স্টেজিংয়ে আগে দেখে নিন:

- ক্যাশ ডেস্ক, ক্যাশিয়ার সেশন, ব্যাংক লাইন, GL পোস্টিং ডিফল্ট
- প্রোডাক্ট পলিসি ভার্সন, প্রতিষ্ঠানের পলিসি, রেগুলেটরি ম্যাপিং, সদস্য আইডেন্টিটি, রিশিডিউল অনুরোধ
- ঋণ রিবেট খরচ ও সঞ্চয় মুনাফা খরচের অ্যাকাউন্ট কলাম

মাইগ্রেশন পুরনো ঋণ বা সঞ্চয়ের ব্যালেন্স নিজে থেকে জার্নালে তোলে না।

## ৬. ফোল্ডার পারমিশন

নতুন আপলোড `storage/app/private` এ থাকে। ওয়েব থেকে সরাসরি এই ফোল্ডার খোলে না। ফাইল যায় লগ-ইন করা রুট `/documents` দিয়ে।

```bash
sudo chown -R www-data:www-data /var/www/misloan/storage /var/www/misloan/bootstrap/cache
sudo chmod -R ug+rwx /var/www/misloan/storage /var/www/misloan/bootstrap/cache
php artisan storage:link
```

`storage:link` শুধু পুরনো পাবলিক ডিস্কের ফাইলের জন্য। নতুন সদস্যের ছবি এই লিংকে রাখবেন না।

## ৭. কনফিগ ক্যাশ

`.env` বদলানোর পর এই তিনটা আবার চালান। না চালালে পুরনো সেটিংস থেকে যায়।

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload php8.4-fpm
```

কনফিগ ক্যাশ থাকলে `env()` শুধু কনফিগ ফাইলে কাজ করে। অ্যাপের কোডে সেটাই ব্যবহার হয়।

## ৮. OPcache

`/etc/php/8.4/fpm/conf.d/10-opcache.ini`:

```ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
```

`validate_timestamps=0` মানে কোড বদলালে PHP নিজে ফাইল দেখে না। প্রতি ডিপ্লয়ের পর `sudo systemctl reload php8.4-fpm` দিন।

PHP-এর আপলোড সীমা সদস্যের ছবির জন্য কমপক্ষে ২০ মেগাবাইট রাখুন: `upload_max_filesize`, `post_max_size`, এবং Nginx-এ `client_max_body_size 20M`।

## ৯. Nginx

সাইটের রুট `public`। অন্য ফোল্ডার রুট করবেন না।

```nginx
server {
    listen 80;
    server_name আপনার-ডোমেইন;
    root /var/www/misloan/public;
    client_max_body_size 20M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

তারপর:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d আপনার-ডোমেইন
```

সার্টিফিকেট নেওয়ার পর `.env`-এর `APP_URL` যেন `https://` দিয়ে শুরু হয়। আবার `php artisan config:cache` চালান।

## ১০. কিউ ওয়ার্কার

এখনকার মেইল সরাসরি পাঠায়, কিউ ছাড়া। তারপরও একটা ওয়ার্কার রাখুন, যাতে পরে কিউতে পড়া কাজ আটকে না থাকে। Redis ব্যবহার করলে কমান্ডের শেষে `redis` দিন। ডাটাবেস ড্রাইভার হলে `database` দিন।

`/etc/supervisor/conf.d/misloan-worker.conf`:

```ini
[program:misloan-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/misloan/artisan queue:work redis --sleep=1 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/misloan/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start misloan-worker:*
```

কোড আপডেটের পর `sudo supervisorctl restart misloan-worker:*`।

## ১১. শিডিউলার

ক্রন না দিলে এই তিনটা চলে না:

- রাত ২:১৫ — আগের অসংকুচিত ছবি কমানো
- সন্ধ্যা ৬টা — নোটিফিকেশন ডাইজেস্ট মেইল
- রাত ৩টা — ১৫ দিনের পুরনো নোটিফিকেশন ছাঁটা

```bash
sudo crontab -u www-data -e
```

এই এক লাইন:

```cron
* * * * * cd /var/www/misloan && php artisan schedule:run >> /dev/null 2>&1
```

## ১২. ডিপ্লয়ের পর যাচাই

1. `https://ডোমেইন` খুলে লগইন হয়।
2. ড্যাশবোর্ড, ঋণ তালিকা, সঞ্চয় তালিকা খোলে। ব্যাজ সংখ্যা ৩০ সেকেন্ড পর্যন্ত আগেরটা থাকতে পারে।
3. একটা নতুন ছবি আপলোড করে রিলোড দিলে ছবি দেখা যায়।
4. `storage/logs/laravel.log`-এ নতুন এরর নেই।
5. `php artisan misloan:check-ledgers --json` চালান। এটা শুধু পড়ে। ফেল করলে পোস্টিং বন্ধ করবেন না, আগে হিসাব মিলিয়ে দেখুন। এই কমান্ড পাস মানেই প্রতিষ্ঠানের পুরো হিসাব অডিট হয়ে গেছে এমন নয়।
6. মেইল সেট থাকলে একটা পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেখুন।

## ১৩. পরের আপডেট

```bash
cd /var/www/misloan
php artisan down
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
sudo systemctl reload php8.4-fpm
sudo supervisorctl restart misloan-worker:*
php artisan up
```

`git pull`-এর আগে ডাম্প নিন। মাইগ্রেশন ফেল করলে `php artisan up` দিয়ে সাইট খুলে সমস্যা দেখুন। ভাঙা অবস্থায় নতুন করে মাইগ্রেট করতে থাকবেন না।

## ১৪. ব্যাকআপ

প্রতিদিন রাখুন:

- MySQL ডাম্প
- `storage/app/private` (নতুন ছবি ও স্বাক্ষর)
- `.env` ও `APP_KEY`

ডাম্প সার্ভারের ভেতরেই শুধু রাখবেন না। অন্য মেশিনে বা এনক্রিপ্টেড স্টোরেজে কপি রাখুন, আর মাসে একবার সেই কপি থেকে রিস্টোর পরীক্ষা করুন।

## ১৫. এখন লাগবে না

- Laravel Octane বা FrankenPHP। সাইট আগে Nginx + PHP-FPM-এ চালু করুন। Octane পরে আলাদা মহড়া।
- নতুন ফ্রন্টএন্ড, সার্চ ইঞ্জিন, বা আলাদা মাইক্রোসার্ভিস।
- লাইভ ডাটাবেসে `php artisan test`। টেস্ট SQLite মেমোরিতে চলে, লাইভ MySQL-এ নয়।
