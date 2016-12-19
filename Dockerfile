FROM alpine

RUN apk add --update nodejs \
                     python
RUN	mkdir -p /kiosk
COPY dist/ /kiosk/
RUN ls -la /kiosk
WORKDIR /kiosk/
# Install app dependencies
RUN npm install
EXPOSE 80

CMD [ "npm", "start" ]