FROM ubuntu:14.04

RUN apt-get update
RUN apt-get -y install nodejs-legacy \
                     python \
		     parted \
		     ntfs-3g \
		     npm \
		     rsync


RUN	mkdir -p /kiosk && mkdir -p /srv && mkdir -p /srv/media

COPY dist/ /kiosk/
COPY media/ /srv/media/
WORKDIR /kiosk/
#RUN npm config set strict-ssl false
# Install app dependencies
RUN npm install
EXPOSE 80

CMD [ "npm", "start" ]