import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { query } from "faunadb";
import { stripe } from "../../services/stripe";
import { fauna } from "../../services/fauna";

type User = {
  ref: {
    id: string;
  };
  data: {
    stripeCustomerId: string;
  };
};

// eslint-disable-next-line import/no-anonymous-default-export
export default async (request: NextApiRequest, response: NextApiResponse) => {
  if (request.method === "POST") {
    const session = await getSession({ req: request });

    const user = await fauna.query<User>(
      query.Get(
        query.Match(
          query.Index("user_by_email"),
          query.Casefold(session.user.email)
        )
      )
    );

    let customerId = user.data.stripeCustomerId;

    if (!customerId) {
      const stripeCustomer = await stripe.customers.create({
        email: session.user.email,
      });

      await fauna.query(
        query.Update(query.Ref(query.Collection("users"), user.ref.id), {
          data: {
            stripeCustomerId: stripeCustomer.id,
          },
        })
      );

      customerId = stripeCustomer.id;
    }

    try {
      const stripeCheckoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        billing_address_collection: "required",
        line_items: [
          {
            price: "price_1KUD8wLba5MH7mSumOP4pQbI",
            quantity: 1,
          },
        ],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
      });
    } catch (error) {
      response.json({ error: error.message });
    }

    response.status(200).json({ sessionId: "stripeCheckoutSession.id" });
  } else {
    response.setHeader("allow", "POST");
    response.status(405).end("Method not allowed");
  }
};
