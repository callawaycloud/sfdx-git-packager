# Common Deployment Issues

The goal of this project is to take the diff of two git refs and generate a valid, deployable package.  Unfortunately due to the "intricacies" (aka bugs) of the metadata API, this does not always work.  Below are the documented known issues:

## Deploying changes to a Master Detail

**Problem**: You go to deploy new fields for an object that is a child in a master-detail relationship.  You get the following error:

> Cannot set sharingModel to ControlledByParent on a CustomObject without a MasterDetail relationship field

**Solution**: Unfortunately, Salesforce isn't smart enough to recognizing that there is already a master-detail relationship in the org. You can resolve this by also [adding the master-detail relationship to the deployment](https://help.salesforce.com/articleView?id=000334872&type=1&mode=1). Also see [StackExchange](https://salesforce.stackexchange.com/questions/50354/cannot-set-sharingmodel-to-controlledbyparent-on-a-customobject-without-a-master)

## New Flow not activated after deployment

**Problem**: You create a new active flow and deploy it.  After deployment it is inactive.

**Solution**: Salesforce has since made it possible to deploy active flows, but [you need to enable it in settings](https://releasenotes.docs.salesforce.com/en-us/winter19/release-notes/rn_forcecom_flow_deploy_as_active.htm).


## Destructive Changes Considerations

By default this package puts all destructive changes in `postDestructive.xml`.  The idea being that more commonly you are deleting depreciated something that will no longer be referenced elsewhere.

However, there are times when you need `preDestructive.xml` changes (changing a field type), as well as times when multiple deployments are required to destruct changes.

At this point, there is no viable algorithmic strategy to properly handles these scenario's.  See [StackExchange](https://salesforce.stackexchange.com/questions/282009/classifying-metadata-into-destructivechangespre-xml-vs-destructivechangespost-xm) for more details.
