# =============================================================================
# Nginx Reverse Proxy Dockerfile
# =============================================================================
FROM nginx

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
