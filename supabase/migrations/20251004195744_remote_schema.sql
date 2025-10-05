revoke delete on table "public"."template" from "anon";

revoke insert on table "public"."template" from "anon";

revoke references on table "public"."template" from "anon";

revoke select on table "public"."template" from "anon";

revoke trigger on table "public"."template" from "anon";

revoke truncate on table "public"."template" from "anon";

revoke update on table "public"."template" from "anon";

revoke delete on table "public"."template" from "authenticated";

revoke insert on table "public"."template" from "authenticated";

revoke references on table "public"."template" from "authenticated";

revoke select on table "public"."template" from "authenticated";

revoke trigger on table "public"."template" from "authenticated";

revoke truncate on table "public"."template" from "authenticated";

revoke update on table "public"."template" from "authenticated";

revoke delete on table "public"."template" from "service_role";

revoke insert on table "public"."template" from "service_role";

revoke references on table "public"."template" from "service_role";

revoke select on table "public"."template" from "service_role";

revoke trigger on table "public"."template" from "service_role";

revoke truncate on table "public"."template" from "service_role";

revoke update on table "public"."template" from "service_role";

alter table "public"."cart" drop constraint "cart_userId_pk";

drop index if exists "public"."cart_userId_pk";


