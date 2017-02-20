FROM alpine

RUN apk add --update nodejs \
                     python
RUN	mkdir -p /kiosk && mkdir -p /srv && mkdir -p /srv/media

COPY dist/ /kiosk/
COPY media/ /srv/media/
WORKDIR /kiosk/
RUN npm config set strict-ssl false
# Install app dependencies
RUN npm install
EXPOSE 80

CMD [ "npm", "start" ]
