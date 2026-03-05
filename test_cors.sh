#!/bin/bash
curl -i -X OPTIONS -H "Origin: http://malicious.com" http://localhost:54321/functions/v1/account-deletion
