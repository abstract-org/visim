##Supabase local env

* Go to https://app.supabase.com/account/tokens
  generate and copy to clipboard your persoanl **access_token**.


* run: `supabase login` and enter that **access_token** from clipboard


* ```cd database/local```


* start *Docker*


* run: `supabase start`
As a success result you will see you local credentials and hosts.


* Copy credentials and add to following variables in file `.env.development.local`

```
REACT_APP_SUPABASE_URL=http://localhost:54321
REACT_APP_SUPABASE_ANON_KEY=<anon key>
REACT_APP_SUPABASE_SERVICE_KEY=<service_role key>
```

* now run all migrations and you are ready to use `npm start` in total offline mode

Magic link emails are captured by InbucketL: http://localhost:54324

