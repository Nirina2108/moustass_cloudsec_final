FROM php:8.2-cli-alpine

WORKDIR /var/www/html

RUN apk add --no-cache curl zip unzip libpng-dev oniguruma-dev libxml2-dev

RUN docker-php-ext-install pdo pdo_mysql mbstring

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install --no-dev --optimize-autoloader

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]