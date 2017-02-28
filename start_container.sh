#!/bin/bash

echo 1 > /proc/sys/kernel/sysrq && service lldpd start && npm start
