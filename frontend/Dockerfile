FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the static application files to Nginx
COPY ./index.html /usr/share/nginx/html/
COPY ./style.css /usr/share/nginx/html/
COPY ./script.js /usr/share/nginx/html/
COPY ./assets /usr/share/nginx/html/assets/

# Copy the custom Nginx configuration
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
